package com.helpboys.api.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${firebase.credentials-json:}")
    private String credentialsJson;

    @PostConstruct
    public void initFirebase() {
        if (credentialsJson == null || credentialsJson.isBlank()) {
            log.warn("[FCM] FIREBASE_CREDENTIALS_JSON 환경변수가 없습니다. 푸시 알림 비활성화.");
            return;
        }
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }
        try {
            InputStream stream = new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8));
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(stream))
                    .build();
            FirebaseApp.initializeApp(options);
            log.info("[FCM] Firebase 초기화 완료");
        } catch (Exception e) {
            log.error("[FCM] Firebase 초기화 실패: {}", e.getMessage());
        }
    }
}