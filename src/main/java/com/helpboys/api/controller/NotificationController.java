package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.NotificationResponse;
import com.helpboys.api.service.NotificationService;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtUtil jwtUtil;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getMyNotifications(
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        return ResponseEntity.ok(ApiResponse.success("조회 성공", notificationService.getMyNotifications(userId)));
    }

    @GetMapping("/unread")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> hasUnread(
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        return ResponseEntity.ok(ApiResponse.success("조회 성공", Map.of("hasUnread", notificationService.hasUnread(userId))));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        notificationService.markAsRead(id, userId);
        return ResponseEntity.ok(ApiResponse.success("읽음 처리 완료", null));
    }
}
