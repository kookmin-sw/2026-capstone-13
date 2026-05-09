package com.helpboys.api.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "notices",
        uniqueConstraints = @UniqueConstraint(columnNames = {"link"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // academic, scholarship, job_internal, job_external
    @Column(name = "category_id", nullable = false)
    private String categoryId;

    @Column(name = "category_name", nullable = false)
    private String categoryName;

    @Column(name = "title_ko", nullable = false, columnDefinition = "TEXT")
    private String titleKo;

    @Column(nullable = false, length = 1000)
    private String link;

    @Column(name = "pub_date")
    private LocalDate pubDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "notice", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<NoticeTranslation> translations = new ArrayList<>();
}
