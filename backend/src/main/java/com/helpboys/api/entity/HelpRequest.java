package com.helpboys.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "help_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HelpRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    // 카테고리: BANK, HOSPITAL, SCHOOL, DAILY, OTHER
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private HelpCategory category;

    // 도움 방식: CHAT, VIDEO_CALL, OFFLINE
    @Column(name = "help_method", nullable = false)
    @Enumerated(EnumType.STRING)
    private HelpMethod helpMethod;

    // 상태: WAITING, MATCHED, IN_PROGRESS, COMPLETED, CANCELLED
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RequestStatus status = RequestStatus.WAITING;

    // 요청자 (유학생)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    // 도와주는 사람 (한국인 학생) - 매칭 전에는 null
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "helper_id")
    private User helper;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public enum HelpCategory {
        BANK, HOSPITAL, SCHOOL, DAILY, OTHER
    }

    public enum HelpMethod {
        CHAT, VIDEO_CALL, OFFLINE
    }

    public enum RequestStatus {
        WAITING, MATCHED, IN_PROGRESS, COMPLETED, CANCELLED
    }
}
