package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.MealResponse;
import com.helpboys.api.service.MealService;
import com.helpboys.api.service.UserService;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meals")
@RequiredArgsConstructor
public class MealController {

    private final MealService mealService;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    /**
     * GET /api/meals?lang=en
     * - lang: 번역 언어 (기본값 en), Authorization 헤더의 사용자 언어 우선
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<MealResponse>>> getWeeklyMeals(
            @RequestParam(required = false) String lang,
            @RequestHeader(value = "Authorization", required = false) String token) {

        String langCode = resolveLang(lang, token);
        List<MealResponse> meals = mealService.getWeeklyMeals(langCode);
        return ResponseEntity.ok(ApiResponse.success("주간 식단 조회 성공", meals));
    }

    /**
     * POST /api/meals/crawl - 수동 크롤링 트리거 (관리자용)
     */
    @PostMapping("/crawl")
    public ResponseEntity<ApiResponse<String>> triggerCrawl(
            @RequestHeader("Authorization") String token) {
        checkAdmin(token);
        new Thread(() -> mealService.crawlAndSave()).start();
        return ResponseEntity.ok(ApiResponse.success("크롤링 시작됨", "백그라운드에서 처리 중"));
    }

    /**
     * POST /api/meals/retranslate - 기존 식단 전체 재번역 (관리자용)
     */
    @PostMapping("/retranslate")
    public ResponseEntity<ApiResponse<String>> retranslate(
            @RequestHeader("Authorization") String token) {
        checkAdmin(token);
        new Thread(() -> mealService.retranslateAll()).start();
        return ResponseEntity.ok(ApiResponse.success("재번역 시작됨", "백그라운드에서 처리 중"));
    }

    /**
     * POST /api/meals/retranslate-missing - 번역 누락 식단만 재번역 (관리자용)
     */
    @PostMapping("/retranslate-missing")
    public ResponseEntity<ApiResponse<String>> retranslateMissing(
            @RequestHeader("Authorization") String token) {
        checkAdmin(token);
        new Thread(() -> mealService.retranslateMissing()).start();
        return ResponseEntity.ok(ApiResponse.success("누락 재번역 시작됨", "백그라운드에서 처리 중"));
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