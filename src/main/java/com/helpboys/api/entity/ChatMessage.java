package com.helpboys.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 채팅방 ID (help_request_id 기반)
    @Column(name = "room_id", nullable = false)
    private Long roomId;

    // 보낸 사람
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // 원본 언어 (예: ko, en, zh)
    @Column(name = "original_language")
    private String originalLanguage;

    // 번역된 내용 (AI 번역 후 저장)
    @Column(name = "translated_content", columnDefinition = "TEXT")
    private String translatedContent;

    // 한국어 문화적 뉘앙스 설명 (Gemini AI 감지)
    @Column(name = "cultural_note", columnDefinition = "TEXT")
    private String culturalNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
