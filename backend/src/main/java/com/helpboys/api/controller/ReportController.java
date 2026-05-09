package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.ReportRequest;
import com.helpboys.api.dto.ReportResponse;
import com.helpboys.api.dto.UserBlockResponse;
import com.helpboys.api.service.ReportService;
import com.helpboys.api.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final JwtUtil jwtUtil;

    // POST /api/reports - 신고 접수
    @PostMapping("/api/reports")
    public ResponseEntity<ApiResponse<ReportResponse>> createReport(
            @Valid @RequestBody ReportRequest request,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("신고가 접수되었습니다.", reportService.createReport(request, userId)));
    }

    // POST /api/users/{userId}/block - 유저 차단
    @PostMapping("/api/users/{userId}/block")
    public ResponseEntity<ApiResponse<Void>> blockUser(
            @PathVariable Long userId,
            @RequestHeader("Authorization") String token) {
        Long blockerId = extractUserId(token);
        reportService.blockUser(blockerId, userId);
        return ResponseEntity.ok(ApiResponse.success("차단되었습니다.", null));
    }

    // DELETE /api/users/{userId}/block - 차단 해제
    @DeleteMapping("/api/users/{userId}/block")
    public ResponseEntity<ApiResponse<Void>> unblockUser(
            @PathVariable Long userId,
            @RequestHeader("Authorization") String token) {
        Long blockerId = extractUserId(token);
        reportService.unblockUser(blockerId, userId);
        return ResponseEntity.ok(ApiResponse.success("차단이 해제되었습니다.", null));
    }

    // GET /api/users/blocked - 내 차단 목록
    @GetMapping("/api/users/blocked")
    public ResponseEntity<ApiResponse<List<UserBlockResponse>>> getBlockedUsers(
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", reportService.getBlockedUsers(userId)));
    }

    // GET /api/users/{userId}/block-status - 차단 여부 확인
    @GetMapping("/api/users/{userId}/block-status")
    public ResponseEntity<ApiResponse<java.util.Map<String, Boolean>>> getBlockStatus(
            @PathVariable Long userId,
            @RequestHeader("Authorization") String token) {
        Long myId = extractUserId(token);
        boolean isBlocked = reportService.isBlocked(myId, userId);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", java.util.Map.of("isBlocked", isBlocked)));
    }

    private Long extractUserId(String bearerToken) {
        return jwtUtil.extractUserIdFromBearer(bearerToken);
    }
}