package com.helpboys.api.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "comment_translations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"comment_id", "lang_code"}))
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentTranslation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id", nullable = false)
    private PostComment comment;

    @Column(name = "lang_code", nullable = false, length = 20)
    private String langCode;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
}
