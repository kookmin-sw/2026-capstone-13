package com.helpboys.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @Column(nullable = false)
    private String message;

    // 알림 대상 ID (커뮤니티 게시글 ID 또는 도움 요청 ID)
    @Column(name = "post_id")
    private Long referenceId;

    // 알림 대상 타입
    @Column(name = "reference_type")
    @Enumerated(EnumType.STRING)
    private ReferenceType referenceType;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum NotificationType {
        COMMENT, REPLY, HELP_OFFER, LIKE, REVIEW_REQUEST, REVIEW_RECEIVED, HELP_COMPLETED,
        STUDENT_ID_APPROVED, STUDENT_ID_REJECTED
    }

    public enum ReferenceType {
        POST, COMMENT, HELP_REQUEST, NONE
    }
}
