package com.helpboys.api.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notice_translations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"notice_id", "lang_code"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NoticeTranslation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notice_id", nullable = false)
    private Notice notice;

    // en, zh-Hans, zh-Hant, ja, vi, mn, fr, de, es
    @Column(name = "lang_code", nullable = false, length = 20)
    private String langCode;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String title;
}
