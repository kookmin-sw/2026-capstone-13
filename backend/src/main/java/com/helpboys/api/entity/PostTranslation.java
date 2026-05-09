package com.helpboys.api.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "post_translations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"post_id", "lang_code"}))
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostTranslation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private CommunityPost post;

    @Column(name = "lang_code", nullable = false, length = 20)
    private String langCode;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
}
