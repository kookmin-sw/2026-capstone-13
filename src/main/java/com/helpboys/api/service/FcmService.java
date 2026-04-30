package com.helpboys.api.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
public class FcmService {

    /**
     * FCM 푸시 알림 전송
     *
     * @param fcmToken  수신자의 FCM 토큰
     * @param title     알림 제목
     * @param body      알림 내용
     */
    public void sendPush(String fcmToken, String title, String body) {
        sendPushWithData(fcmToken, title, body, Map.of());
    }

    public void sendPushWithData(String fcmToken, String title, String body, Map<String, String> data) {
        if (fcmToken == null || fcmToken.isBlank()) {
            return;
        }
        if (FirebaseApp.getApps().isEmpty()) {
            log.warn("[FCM] Firebase 미초기화 상태. 푸시 전송 건너뜀.");
            return;
        }
        try {
            Message.Builder builder = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build());
            data.forEach(builder::putData);
            String response = FirebaseMessaging.getInstance().send(builder.build());
            log.info("[FCM] 푸시 전송 성공: {}", response);
        } catch (Exception e) {
            log.warn("[FCM] 푸시 전송 실패: {}", e.getMessage());
        }
    }
}