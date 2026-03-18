package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.NoticeResponse;
import com.helpboys.api.service.NoticeService;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;
    private final JwtUtil jwtUtil;

    /**
     * GET /api/notices?lang=en&category=academic
     * - lang: 번역 언어 (기본값 en), Authorization 헤더의 사용자 언어 우선
     * - category: academic | scholarship | job_internal | job_external (선택)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<NoticeResponse>>> getNotices(
            @RequestParam(required = false) String lang,
            @RequestParam(required = false) String category,
            @RequestHeader(value = "Authorization", required = false) String token) {

        String langCode = resolveLang(lang, token);
        List<NoticeResponse> notices = noticeService.getNotices(langCode, category);
        return ResponseEntity.ok(ApiResponse.success("공지사항 조회 성공", notices));
    }

    /**
     * POST /api/notices/crawl - 수동 크롤링 트리거 (관리자용)
     */
    @PostMapping("/crawl")
    public ResponseEntity<ApiResponse<String>> triggerCrawl() {
        int count = noticeService.crawlAndSave();
        return ResponseEntity.ok(ApiResponse.success("크롤링 완료", count + "건 저장됨"));
    }

    private String resolveLang(String queryLang, String token) {
        if (queryLang != null && !queryLang.isBlank()) return queryLang;
        if (token != null) {
            try {
                // JWT에서 언어 추출 (추후 확장)
            } catch (Exception ignored) {}
        }
        return "en";
    }
}
