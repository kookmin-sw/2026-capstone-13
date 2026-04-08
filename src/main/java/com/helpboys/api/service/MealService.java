package com.helpboys.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.helpboys.api.dto.MealResponse;
import com.helpboys.api.entity.Meal;
import com.helpboys.api.entity.MealTranslation;
import com.helpboys.api.repository.MealRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MealService {

    private final MealRepository mealRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(5))
            .build();

    @Value("${ai.server.url:http://localhost:8000}")
    private String aiServerUrl;

    /**
     * AI 서버에 크롤링 요청 → 결과를 DB에 저장
     */
    @Transactional
    public int crawlAndSave() {
        log.info("[식단 크롤러] 크롤링 시작...");
        int savedCount = 0;
        int updatedCount = 0;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(aiServerUrl + "/api/meals/crawl"))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("[식단 크롤러] AI 서버 응답 오류: {}", response.statusCode());
                return 0;
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode data = root.get("data");

            if (data == null || !data.isArray()) {
                log.warn("[식단 크롤러] 응답 데이터 없음");
                return 0;
            }

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy.MM.dd");

            for (JsonNode item : data) {
                String cafeteriaKo = item.path("cafeteria_ko").asText();
                String cornerKo    = item.path("corner_ko").asText();
                String newMenu     = item.path("menu").asText();
                String dateStr     = item.path("date").asText();
                LocalDate mealDate = LocalDate.parse(dateStr, formatter);
                JsonNode translations = item.get("translations");

                java.util.Optional<Meal> existing =
                        mealRepository.findByCafeteriaAndCornerAndMealDate(cafeteriaKo, cornerKo, mealDate);

                if (existing.isPresent()) {
                    Meal meal = existing.get();
                    // 메뉴가 바뀐 경우에만 업데이트
                    if (meal.getMenu().equals(newMenu)) continue;
                    meal.setMenu(newMenu);
                    meal.getTranslations().clear();
                    mealRepository.saveAndFlush(meal);
                    addTranslations(meal, translations, cafeteriaKo, cornerKo);
                    mealRepository.save(meal);
                    updatedCount++;
                } else {
                    Meal meal = Meal.builder()
                            .mealDate(mealDate)
                            .cafeteria(cafeteriaKo)
                            .corner(cornerKo)
                            .menu(newMenu)
                            .build();
                    addTranslations(meal, translations, cafeteriaKo, cornerKo);
                    mealRepository.save(meal);
                    savedCount++;
                }
            }

            log.info("[식단 크롤러] 신규 {}건 저장, {}건 업데이트 완료", savedCount, updatedCount);

        } catch (Exception e) {
            log.error("[식단 크롤러] 오류: {}", e.getMessage(), e);
        }

        return savedCount + updatedCount;
    }

    private void addTranslations(Meal meal, JsonNode translations, String cafeteriaKo, String cornerKo) {
        if (translations == null) return;
        List<MealTranslation> translationList = new ArrayList<>();
        translations.fields().forEachRemaining(entry -> {
            JsonNode t = entry.getValue();
            String menuTranslated = t.path("menu").asText(null);
            translationList.add(MealTranslation.builder()
                    .meal(meal)
                    .langCode(entry.getKey())
                    .cafeteria(t.path("cafeteria").asText(cafeteriaKo))
                    .corner(t.path("corner").asText(cornerKo))
                    .menu(menuTranslated)
                    .build());
        });
        meal.getTranslations().addAll(translationList);
    }

    private static final List<String> SUPPORTED_LANGUAGES =
            List.of("en", "ja", "zh-Hans", "ru", "mn", "vi");

    /**
     * 번역 누락 식단만 재번역 (크롤 시 번역 실패한 경우 복구용)
     */
    public int retranslateMissing() {
        List<Long> ids = mealRepository.findMealsWithNoTranslations().stream()
                .map(Meal::getId).toList();
        int count = 0;
        for (Long id : ids) {
            try {
                retranslateOne(id);
                count++;
            } catch (Exception e) {
                log.warn("[식단 재번역-누락] id={} 실패: {}", id, e.getMessage());
            }
        }
        log.info("[식단 재번역-누락] {}건 완료", count);
        return count;
    }

    /**
     * 기존 식단 전체 재번역 — 식단별 별도 트랜잭션으로 처리
     */
    public int retranslateAll() {
        List<Long> ids = mealRepository.findAll().stream()
                .map(Meal::getId).toList();
        int count = 0;
        for (Long id : ids) {
            try {
                retranslateOne(id);
                count++;
            } catch (Exception e) {
                log.warn("[식단 재번역] id={} 실패: {}", id, e.getMessage());
            }
        }
        log.info("[식단 재번역] {}건 완료", count);
        return count;
    }

    @Transactional
    public void retranslateOne(Long mealId) {
        Meal meal = mealRepository.findById(mealId).orElseThrow();

        // 1단계: AI 번역 먼저 수행
        List<MealTranslation> newTranslations = new ArrayList<>();
        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "cafeteria", meal.getCafeteria(),
                    "corner",    meal.getCorner(),
                    "menu",      meal.getMenu()
            ));
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(aiServerUrl + "/api/meals/translate-batch"))
                    .header("Content-Type", "application/json")
                    .timeout(java.time.Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode translations = objectMapper.readTree(resp.body()).path("data");

            translations.fields().forEachRemaining(entry -> {
                JsonNode t = entry.getValue();
                newTranslations.add(MealTranslation.builder()
                        .meal(meal).langCode(entry.getKey())
                        .cafeteria(t.path("cafeteria").asText(meal.getCafeteria()))
                        .corner(t.path("corner").asText(meal.getCorner()))
                        .menu(t.path("menu").asText(meal.getMenu()))
                        .build());
            });
        } catch (Exception e) {
            log.warn("[식단 재번역] id={} AI 호출 실패 — 기존 번역 유지: {}", mealId, e.getMessage());
            return;
        }

        if (newTranslations.isEmpty()) {
            log.warn("[식단 재번역] id={} 번역 결과 없음 — 기존 번역 유지", mealId);
            return;
        }

        // 2단계: 번역 성공 확인 후 교체
        meal.getTranslations().clear();
        mealRepository.saveAndFlush(meal);
        meal.getTranslations().addAll(newTranslations);
        mealRepository.save(meal);
    }

    /**
     * 오늘 식단 조회
     */
    @Transactional(readOnly = true)
    public List<MealResponse> getTodayMeals(String langCode) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        List<Meal> meals = mealRepository.findByMealDateWithTranslations(today);
        return meals.stream()
                .collect(java.util.stream.Collectors.toMap(
                        Meal::getId, m -> m, (a, b) -> a, java.util.LinkedHashMap::new
                ))
                .values().stream()
                .map(m -> MealResponse.from(m, langCode))
                .toList();
    }

    /**
     * 오늘~6일치 식단 조회
     */
    @Transactional(readOnly = true)
    public List<MealResponse> getWeeklyMeals(String langCode) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        List<Meal> meals = mealRepository.findByMealDateBetweenWithTranslations(today, today.plusDays(6));
        return meals.stream()
                .collect(java.util.stream.Collectors.toMap(
                        Meal::getId, m -> m, (a, b) -> a, java.util.LinkedHashMap::new
                ))
                .values().stream()
                .map(m -> MealResponse.from(m, langCode))
                .toList();
    }

    /**
     * 지난 식단 삭제 (어제 이전)
     */
    @Transactional
    public int deleteOldMeals() {
        LocalDate yesterday = LocalDate.now(ZoneId.of("Asia/Seoul")).minusDays(1);
        List<Meal> old = mealRepository.findByMealDateBefore(yesterday);
        mealRepository.deleteAll(old);
        log.info("[식단 정리] {}건 삭제", old.size());
        return old.size();
    }
}