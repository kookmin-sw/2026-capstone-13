package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.MealResponse;
import com.helpboys.api.service.MealService;
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
    private final JwtUtil jwtUtil;

    /**
     * GET /api/meals?lang=en
     * - lang: 번역 언어 (기본값 en), Authorization 헤더의 사용자 언어 우선
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<MealResponse>>> getTodayMeals(
            @RequestParam(required = false) String lang,
            @RequestHeader(value = "Authorization", required = false) String token) {

        String langCode = resolveLang(lang, token);
        List<MealResponse> meals = mealService.getTodayMeals(langCode);
        return ResponseEntity.ok(ApiResponse.success("오늘의 식단 조회 성공", meals));
    }

    /**
     * POST /api/meals/crawl - 수동 크롤링 트리거 (관리자용)
     */
    @PostMapping("/crawl")
    public ResponseEntity<ApiResponse<String>> triggerCrawl() {
        int count = mealService.crawlAndSave();
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