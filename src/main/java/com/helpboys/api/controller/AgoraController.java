package com.helpboys.api.controller;

import com.helpboys.api.dto.AgoraTokenResponse;
import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.service.AgoraService;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/agora")
@RequiredArgsConstructor
public class AgoraController {

    private final AgoraService agoraService;
    private final JwtUtil jwtUtil;

    // GET /api/agora/token?channelName=room_1
    @GetMapping("/token")
    public ResponseEntity<ApiResponse<AgoraTokenResponse>> generateToken(
            @RequestParam String channelName,
            @RequestHeader("Authorization") String token) {

        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        AgoraTokenResponse response = agoraService.generateToken(channelName, userId);
        return ResponseEntity.ok(ApiResponse.success("토큰 생성 성공", response));
    }
}
