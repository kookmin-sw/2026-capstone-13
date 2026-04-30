package com.helpboys.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FcmService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final RestTemplate restTemplate;

    public void sendPush(String expoToken, String title, String body) {
        sendPushWithData(expoToken, title, body, "notifications", Map.of());
    }

    public void sendPushWithData(String expoToken, String title, String body, Map<String, String> data) {
        sendPushWithData(expoToken, title, body, "notifications", data);
    }

    public void sendPushWithData(String expoToken, String title, String body,
                                  String channelId, Map<String, String> data) {
        if (expoToken == null || expoToken.isBlank()) {
            return;
        }
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("to", expoToken);
            payload.put("title", title);
            payload.put("body", body);
            payload.put("channelId", channelId);
            payload.put("data", data);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Accept", "application/json");
            headers.set("Accept-Encoding", "gzip, deflate");

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(EXPO_PUSH_URL, request, String.class);
            log.info("[Expo Push] 전송 성공: {}", response.getBody());
        } catch (Exception e) {
            log.warn("[Expo Push] 전송 실패: {}", e.getMessage());
        }
    }
}