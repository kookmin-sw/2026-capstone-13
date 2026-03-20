package com.helpboys.api.service;

import com.helpboys.api.dto.NotificationResponse;
import com.helpboys.api.entity.Notification;
import com.helpboys.api.entity.User;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.NotificationRepository;
import com.helpboys.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    // 내 알림 목록 조회
    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(Long userId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationResponse::from)
                .collect(Collectors.toList());
    }

    // 읽지 않은 알림 존재 여부
    @Transactional(readOnly = true)
    public boolean hasUnread(Long userId) {
        return notificationRepository.existsByRecipientIdAndIsReadFalse(userId);
    }

    // 알림 읽음 처리
    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException("알림을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        if (!notification.getRecipient().getId().equals(userId)) {
            throw new BusinessException("권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    // 알림 생성 (내부용)
    @Transactional
    public void createNotification(Long recipientId, Notification.NotificationType type,
                                   String message, Long postId) {
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(type)
                .message(message)
                .postId(postId)
                .build();

        notificationRepository.save(notification);
    }
}
