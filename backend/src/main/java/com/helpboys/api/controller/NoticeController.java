package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.NoticeResponse;
import com.helpboys.api.service.NoticeService;
import com.helpboys.api.service.UserService;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    /**
     * GET /api/notices?lang=en&category=academic
     * - lang: 번역 언어 (기본값 en), Authorization 헤더의 사용자 언어 우선
     * - category: academic | scholarship | job_internal | job_external (선택)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NoticeResponse>>> getNotices(
            @RequestParam(required = false) String lang,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = "Authorization", required = false) String token) {

        String langCode = resolveLang(lang, token);
        Page<NoticeResponse> notices = noticeService.getNotices(langCode, category, page, size);
        return ResponseEntity.ok(ApiResponse.success("공지사항 조회 성공", notices));
    }

    /**
     * POST /api/notices/crawl - 수동 크롤링 트리거 (관리자용)
     */
    @PostMapping("/crawl")
    public ResponseEntity<ApiResponse<String>> triggerCrawl(
            @RequestHeader("Authorization") String token) {
        checkAdmin(token);
        int count = noticeService.crawlAndSave();
        return ResponseEntity.ok(ApiResponse.success("크롤링 완료", count + "건 저장됨"));
    }

    /**
     * POST /api/notices/retranslate - 기존 공지 재번역 (관리자용)
     */
    @PostMapping("/retranslate")
    public ResponseEntity<ApiResponse<String>> retranslate(
            @RequestHeader("Authorization") String token) {
        checkAdmin(token);
        new Thread(() -> noticeService.retranslateAll()).start();
        return ResponseEntity.ok(ApiResponse.success("재번역 시작됨", "백그라운드에서 처리 중"));
    }

    private void checkAdmin(String token) {
        Long userId = jwtUtil.extractUserIdFromBearer(token);
        userService.checkAdmin(userId);
    }

    private String resolveLang(String queryLang, String token) {
        if (queryLang != null && !queryLang.isBlank()) return queryLang;
        if (token != null) {
            try {
                Long userId = jwtUtil.extractUserIdFromBearer(token);
                return userService.getUserPreferredLanguage(userId);
            } catch (Exception ignored) {}
        }
        return "en";
    }
}
