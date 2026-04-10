package com.helpboys.api.service;

import com.helpboys.api.dto.NotificationResponse;
import com.helpboys.api.entity.Notification;
import com.helpboys.api.entity.User;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.NotificationRepository;
import com.helpboys.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final FcmService fcmService;

    // 내 알림 목록 조회 (페이지네이션)
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(Long userId, int page, int size) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(NotificationResponse::from);
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

    // 알림 생성 (내부용) - @Async: 메인 트랜잭션 커밋 후 별도 스레드에서 실행, 실패해도 호출자에 영향 없음
    @Async
    @Transactional
    public void createNotification(Long recipientId, Notification.NotificationType type,
                                   String message, Long referenceId,
                                   Notification.ReferenceType referenceType) {
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(type)
                .message(message)
                .referenceId(referenceId)
                .referenceType(referenceType)
                .build();

        notificationRepository.save(notification);

        // FCM 푸시 알림 전송
        if (recipient.getFcmToken() != null) {
            String title = switch (type) {
                case COMMENT -> "새 댓글";
                case REPLY -> "새 대댓글";
                case LIKE -> "좋아요";
                case HELP_OFFER -> "도움 제안";
                case REVIEW_REQUEST -> "리뷰 작성 요청";
                case REVIEW_RECEIVED -> "새 리뷰";
                case HELP_COMPLETED -> "도움 완료";
                case STUDENT_ID_APPROVED -> "학생증 인증 승인";
                case STUDENT_ID_REJECTED -> "학생증 인증 거절";
            };
            fcmService.sendPush(recipient.getFcmToken(), title, message);
        }
    }

    // 모두 읽음 처리
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByRecipientId(userId);
    }
}
