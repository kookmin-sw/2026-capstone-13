package com.helpboys.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.helpboys.api.dto.NoticeResponse;
import com.helpboys.api.entity.Notice;
import com.helpboys.api.entity.NoticeTranslation;
import com.helpboys.api.repository.NoticeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
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
        log.info("[공지 크롤러] 크롤링 시작...");
        int savedCount = 0;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(aiServerUrl + "/api/notices/crawl"))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("[공지 크롤러] AI 서버 응답 오류: {}", response.statusCode());
                return 0;
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode data = root.get("data");

            if (data == null || !data.isArray()) {
                log.warn("[공지 크롤러] 응답 데이터 없음");
                return 0;
            }

            for (JsonNode item : data) {
                String link = item.path("link").asText();

                // 중복 방지
                if (noticeRepository.existsByLink(link)) continue;

                Notice notice = Notice.builder()
                        .categoryId(item.path("category_id").asText())
                        .categoryName(item.path("category_name").asText())
                        .titleKo(item.path("title_ko").asText())
                        .link(link)
                        .pubDate(parseDate(item.path("date").asText(null)))
                        .build();

                // 번역 저장
                JsonNode translations = item.get("translations");
                if (translations != null) {
                    List<NoticeTranslation> translationList = new ArrayList<>();
                    translations.fields().forEachRemaining(entry -> {
                        translationList.add(NoticeTranslation.builder()
                                .notice(notice)
                                .langCode(entry.getKey())
                                .title(entry.getValue().asText())
                                .build());
                    });
                    notice.getTranslations().addAll(translationList);
                }

                noticeRepository.save(notice);
                savedCount++;
            }

            log.info("[공지 크롤러] 신규 {}건 저장 완료", savedCount);

        } catch (Exception e) {
            log.error("[공지 크롤러] 오류: {}", e.getMessage(), e);
        }

        return savedCount;
    }

    private static final List<String> SUPPORTED_LANGUAGES =
            List.of("en", "zh-Hans", "zh-Hant", "ja", "vi", "mn", "fr", "de", "es", "ru");

    /**
     * 기존 공지 전체 재번역 — 공지별 별도 트랜잭션으로 처리
     */
    public int retranslateAll() {
        List<Long> ids = noticeRepository.findAll().stream()
                .map(Notice::getId).toList();
        int count = 0;
        for (Long id : ids) {
            try {
                retranslateOne(id);
                count++;
            } catch (Exception e) {
                log.warn("[공지 재번역] id={} 실패: {}", id, e.getMessage());
            }
        }
        log.info("[공지 재번역] {}건 완료", count);
        return count;
    }

    @Transactional
    public void retranslateOne(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId).orElseThrow();
        notice.getTranslations().clear();
        noticeRepository.saveAndFlush(notice);
        for (String lang : SUPPORTED_LANGUAGES) {
            try {
                String body = objectMapper.writeValueAsString(
                        Map.of("text", notice.getTitleKo(), "target_lang", lang, "source_lang", "ko"));
                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(aiServerUrl + "/api/translate"))
                        .header("Content-Type", "application/json")
                        .timeout(java.time.Duration.ofSeconds(15))
                        .POST(HttpRequest.BodyPublishers.ofString(body)).build();
                HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
                JsonNode result = objectMapper.readTree(resp.body());
                if (result.path("success").asBoolean()) {
                    String translated = result.path("data").path("translated").asText(notice.getTitleKo());
                    notice.getTranslations().add(
                            NoticeTranslation.builder().notice(notice).langCode(lang).title(translated).build());
                }
            } catch (Exception e) {
                log.warn("[공지 재번역] id={} {} 언어 실패: {}", noticeId, lang, e.getMessage());
            }
        }
        noticeRepository.save(notice);
    }

    /**
     * 전체 공지 조회 (사용자 언어 기준, 페이지네이션)
     */
    @Transactional(readOnly = true)
    public Page<NoticeResponse> getNotices(String langCode, String categoryId, int page, int size) {
        Page<Notice> notices = categoryId != null
                ? noticeRepository.findByCategoryIdPaged(categoryId, PageRequest.of(page, size))
                : noticeRepository.findAllPaged(PageRequest.of(page, size));

        return notices.map(n -> NoticeResponse.from(n, langCode));
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        try {
            return LocalDate.parse(dateStr);
        } catch (Exception e) {
            return null;
        }
    }
}
