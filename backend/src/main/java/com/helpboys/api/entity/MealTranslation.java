package com.helpboys.api.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "meal_translations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"meal_id", "lang_code"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealTranslation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meal_id", nullable = false)
    private Meal meal;

    // en, zh-Hans, zh-Hant, ja, vi, mn, fr, de, es
    @Column(name = "lang_code", nullable = false, length = 20)
    private String langCode;

    @Column(name = "cafeteria", nullable = false)
    private String cafeteria;

    @Column(nullable = false)
    private String corner;

    @Column(columnDefinition = "TEXT")
    private String menu;
}