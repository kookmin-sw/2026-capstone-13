package com.helpboys.api.config;

import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) return message;

        // CONNECT 시점에 JWT 검증 후 Principal에 userId 저장
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.warn("[WebSocket] 인증 헤더 없음 - 연결 차단");
                throw new IllegalArgumentException("WebSocket 연결에 JWT 토큰이 필요합니다.");
            }
            try {
                String token = authHeader.substring(7);
                Long userId = jwtUtil.extractUserId(token);
                accessor.setUser(() -> String.valueOf(userId));
                log.info("[WebSocket] 인증 성공 - userId: {}", userId);
            } catch (Exception e) {
                log.warn("[WebSocket] 토큰 검증 실패 - {}", e.getMessage());
                throw new IllegalArgumentException("유효하지 않은 JWT 토큰입니다.");
            }
        }

        return message;
    }
}