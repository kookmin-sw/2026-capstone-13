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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

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

    /**
     * 전체 공지 조회 (사용자 언어 기준)
     */
    @Transactional(readOnly = true)
    public List<NoticeResponse> getNotices(String langCode, String categoryId) {
        List<Notice> notices = categoryId != null
                ? noticeRepository.findByCategoryIdOrderByPubDateDescCreatedAtDesc(categoryId)
                : noticeRepository.findAllByOrderByPubDateDescCreatedAtDesc();

        return notices.stream()
                .map(n -> NoticeResponse.from(n, langCode))
                .toList();
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
