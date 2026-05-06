package com.helpboys.api.controller;

import com.helpboys.api.dto.AgoraTokenResponse;
import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.service.AgoraService;
import com.helpboys.api.util.JwtUtil;
import com.helpboys.api.util.RateLimiter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/agora")
@RequiredArgsConstructor
public class AgoraController {

    private final AgoraService agoraService;
    private final JwtUtil jwtUtil;
    private final RateLimiter rateLimiter;

    // GET /api/agora/token?channelName=room_1
    @GetMapping("/token")
    public ResponseEntity<ApiResponse<AgoraTokenResponse>> generateToken(
            @RequestParam String channelName,
            @RequestHeader("Authorization") String token) {

        Long userId = jwtUtil.extractUserIdFromBearer(token);
        if (!rateLimiter.isAllowed("agora:min:" + userId, 5, 60) ||
            !rateLimiter.isAllowed("agora:day:" + userId, 20, 86400)) {
            throw new BusinessException("토큰 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", HttpStatus.TOO_MANY_REQUESTS);
        }
        AgoraTokenResponse response = agoraService.generateToken(channelName, userId);
        return ResponseEntity.ok(ApiResponse.success("토큰 생성 성공", response));
    }
}
