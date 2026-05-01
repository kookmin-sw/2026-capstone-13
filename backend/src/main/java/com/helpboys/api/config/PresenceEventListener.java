package com.helpboys.api.config;

import com.helpboys.api.entity.User;
import com.helpboys.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class PresenceEventListener {

    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleConnect(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        updateAndBroadcast(accessor, true);
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        updateAndBroadcast(accessor, false);
    }

    private void updateAndBroadcast(StompHeaderAccessor accessor, boolean connected) {
        if (accessor.getUser() == null) return;
        try {
            Long userId = Long.parseLong(accessor.getUser().getName());
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) return;

            user.setLastSeenAt(LocalDateTime.now());
            userRepository.save(user);

            messagingTemplate.convertAndSend(
                "/topic/presence/" + userId,
                Map.of("userId", userId, "online", connected, "lastSeenAt", user.getLastSeenAt().toString())
            );
            log.info("[Presence] userId={} online={}", userId, connected);
        } catch (Exception e) {
            log.warn("[Presence] 처리 실패: {}", e.getMessage());
        }
    }
}
