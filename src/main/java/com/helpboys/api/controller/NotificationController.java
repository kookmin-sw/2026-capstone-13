package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.NotificationResponse;
import com.helpboys.api.service.NotificationService;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtUtil jwtUtil;

    // GET /api/notifications - 내 알림 목록
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getMyNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공",
                notificationService.getMyNotifications(userId, page, size)));
    }

    // GET /api/notifications/unread - 읽지 않은 알림 여부
    @GetMapping("/unread")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> hasUnread(
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공",
                Map.of("hasUnread", notificationService.hasUnread(userId))));
    }

    // PATCH /api/notifications/{id}/read - 알림 읽음 처리
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        notificationService.markAsRead(id, userId);
        return ResponseEntity.ok(ApiResponse.success("읽음 처리 완료", null));
    }

    private Long extractUserId(String bearerToken) {
        return jwtUtil.extractUserId(bearerToken.replace("Bearer ", ""));
    }
}
