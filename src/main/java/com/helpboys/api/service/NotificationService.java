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

    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(Long userId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean hasUnread(Long userId) {
        return notificationRepository.existsByRecipientIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getRecipient().getId().equals(userId)) {
                n.setIsRead(true);
                notificationRepository.save(n);
            }
        });
    }

    @Transactional
    public void createNotification(Long recipientId, Notification.NotificationType type, String message, Long postId) {
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
