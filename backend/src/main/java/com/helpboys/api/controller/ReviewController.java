package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.ReviewRequest;
import com.helpboys.api.dto.ReviewResponse;
import com.helpboys.api.service.ReviewService;
import com.helpboys.api.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final JwtUtil jwtUtil;

    // POST /api/reviews/{helpRequestId} - 리뷰 작성
    @PostMapping("/{helpRequestId}")
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @PathVariable Long helpRequestId,
            @Valid @RequestBody ReviewRequest request,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("리뷰가 등록되었습니다.",
                        reviewService.createReview(helpRequestId, request, userId)));
    }

    // GET /api/reviews/{helpRequestId}/status - 내가 이미 리뷰했는지 확인
    @GetMapping("/{helpRequestId}/status")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> reviewStatus(
            @PathVariable Long helpRequestId,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        boolean reviewed = reviewService.hasReviewed(helpRequestId, userId);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", Map.of("reviewed", reviewed)));
    }

    // GET /api/reviews/user/{userId} - 특정 유저가 받은 리뷰 목록
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getUserReviews(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(ApiResponse.success("조회 성공",
                reviewService.getReviewsByUser(userId, page, size)));
    }

    private Long extractUserId(String bearerToken) {
        return jwtUtil.extractUserIdFromBearer(bearerToken);
    }
}
