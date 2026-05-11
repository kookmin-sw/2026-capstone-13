package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private static final long SPEECH_TOKEN_TTL_SECONDS = 300;
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final JwtUtil jwtUtil;

    @Value("${ai.shared-secret:}")
    private String sharedSecret;

    @GetMapping("/speech-token")
    public ResponseEntity<ApiResponse<Map<String, Object>>> issueSpeechToken(
            @RequestHeader("Authorization") String token) {
        if (sharedSecret == null || sharedSecret.isBlank()) {
            throw new BusinessException("AI 인증 키가 설정되지 않았습니다.", HttpStatus.SERVICE_UNAVAILABLE);
        }

        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        long expiresAt = Instant.now().getEpochSecond() + SPEECH_TOKEN_TTL_SECONDS;
        String payload = userId + "." + expiresAt;
        String signature = sign(payload);
        String speechToken = payload + "." + signature;

        return ResponseEntity.ok(ApiResponse.success("AI 자막 토큰 발급 완료", Map.of(
                "token", speechToken,
                "expiresAt", expiresAt
        )));
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(sharedSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(
                    mac.doFinal(payload.getBytes(StandardCharsets.UTF_8))
            );
        } catch (Exception e) {
            throw new BusinessException("AI 자막 토큰 생성에 실패했습니다.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
