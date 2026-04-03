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
                String dateStr     = item.path("date").asText();
                LocalDate mealDate = LocalDate.parse(dateStr, formatter);

                // 중복 방지
                if (mealRepository.existsByCafeteriaAndCornerAndMealDate(cafeteriaKo, cornerKo, mealDate)) continue;

                Meal meal = Meal.builder()
                        .mealDate(mealDate)
                        .cafeteria(cafeteriaKo)
                        .corner(cornerKo)
                        .menu(item.path("menu").asText())
                        .build();

                // 번역 저장 (식당명 + 코너명)
                JsonNode translations = item.get("translations");
                if (translations != null) {
                    List<MealTranslation> translationList = new ArrayList<>();
                    translations.fields().forEachRemaining(entry -> {
                        JsonNode t = entry.getValue();
                        translationList.add(MealTranslation.builder()
                                .meal(meal)
                                .langCode(entry.getKey())
                                .cafeteria(t.path("cafeteria").asText(cafeteriaKo))
                                .corner(t.path("corner").asText(cornerKo))
                                .build());
                    });
                    meal.getTranslations().addAll(translationList);
                }

                mealRepository.save(meal);
                savedCount++;
            }

            log.info("[식단 크롤러] 신규 {}건 저장 완료", savedCount);

        } catch (Exception e) {
            log.error("[식단 크롤러] 오류: {}", e.getMessage(), e);
        }

        return savedCount;
    }

    private static final List<String> SUPPORTED_LANGUAGES =
            List.of("en", "zh-Hans", "zh-Hant", "ja", "vi", "mn", "fr", "de", "es", "ru");

    /**
     * 기존 식단 전체 재번역 (DB의 cafeteria/corner 한국어로 Gemini 번역)
     */
    @Transactional
    public int retranslateAll() {
        List<Meal> meals = mealRepository.findAll();
        int count = 0;
        for (Meal meal : meals) {
            meal.getTranslations().clear();
            mealRepository.saveAndFlush(meal);
            for (String lang : SUPPORTED_LANGUAGES) {
                try {
                    String cafBody = objectMapper.writeValueAsString(
                            Map.of("text", meal.getCafeteria(), "target_lang", lang, "source_lang", "ko"));
                    HttpRequest cafReq = HttpRequest.newBuilder()
                            .uri(URI.create(aiServerUrl + "/api/translate"))
                            .header("Content-Type", "application/json")
                            .timeout(java.time.Duration.ofSeconds(15))
                            .POST(HttpRequest.BodyPublishers.ofString(cafBody)).build();
                    HttpResponse<String> cafResp = httpClient.send(cafReq, HttpResponse.BodyHandlers.ofString());
                    String translatedCaf = objectMapper.readTree(cafResp.body())
                            .path("data").path("translated").asText(meal.getCafeteria());

                    String corBody = objectMapper.writeValueAsString(
                            Map.of("text", meal.getCorner(), "target_lang", lang, "source_lang", "ko"));
                    HttpRequest corReq = HttpRequest.newBuilder()
                            .uri(URI.create(aiServerUrl + "/api/translate"))
                            .header("Content-Type", "application/json")
                            .timeout(java.time.Duration.ofSeconds(15))
                            .POST(HttpRequest.BodyPublishers.ofString(corBody)).build();
                    HttpResponse<String> corResp = httpClient.send(corReq, HttpResponse.BodyHandlers.ofString());
                    String translatedCor = objectMapper.readTree(corResp.body())
                            .path("data").path("translated").asText(meal.getCorner());

                    meal.getTranslations().add(MealTranslation.builder()
                            .meal(meal).langCode(lang)
                            .cafeteria(translatedCaf).corner(translatedCor)
                            .build());
                } catch (Exception e) {
                    log.warn("[식단 재번역] {} 언어 실패: {}", lang, e.getMessage());
                }
            }
            mealRepository.save(meal);
            count++;
        }
        log.info("[식단 재번역] {}건 완료", count);
        return count;
    }

    /**
     * 오늘 식단 조회
     */
    @Transactional(readOnly = true)
    public List<MealResponse> getTodayMeals(String langCode) {
        LocalDate today = LocalDate.now();
        List<Meal> meals = mealRepository.findByMealDateWithTranslations(today);
        return meals.stream()
                .map(m -> MealResponse.from(m, langCode))
                .toList();
    }
}