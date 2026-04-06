package com.helpboys.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String nickname;

    // INTERNATIONAL(유학생), KOREAN(한국인 학생)
    @Column(name = "user_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private UserType userType;

    @Column(nullable = false)
    private String university;

    @Column(name = "profile_image")
    private String profileImage;

    // 선호 언어 (en, zh-Hans, zh-Hant, ja, vi, mn, fr, de, es 등)
    @Column(name = "preferred_language", nullable = false)
    @Builder.Default
    private String preferredLanguage = "en";

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column
    private String gender;

    @Column
    private String age;

    @Column
    private String major;

    @Column
    private String mbti;

    // 취미 (쉼표 구분, 예: "독서,운동,게임")
    @Column(columnDefinition = "TEXT")
    private String hobbies;

    // 이메일 인증 여부
    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    // 학생증 인증 여부
    @Column(name = "student_id_verified", nullable = false)
    @Builder.Default
    private boolean studentIdVerified = false;

    // 학생증 이미지 URL
    @Column(name = "student_id_image_url", columnDefinition = "TEXT")
    private String studentIdImageUrl;

    // 학생증 심사 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "student_id_status", nullable = false)
    @Builder.Default
    private StudentIdStatus studentIdStatus = StudentIdStatus.NONE;

    // 관리자 여부 (DB에서 직접 설정)
    @Column(name = "is_admin", nullable = false)
    @Builder.Default
    private boolean isAdmin = false;

    // FCM 푸시 알림 토큰 (앱 로그인 시 저장)
    @Column(name = "fcm_token", columnDefinition = "TEXT")
    private String fcmToken;

    @Column(nullable = false)
    @Builder.Default
    private Double rating = 0.0;

    @Column(name = "help_count", nullable = false)
    @Builder.Default
    private Integer helpCount = 0;

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

    public enum UserType {
        INTERNATIONAL, EXCHANGE, KOREAN
    }

    public enum StudentIdStatus {
        NONE, PENDING, APPROVED, REJECTED
    }
}