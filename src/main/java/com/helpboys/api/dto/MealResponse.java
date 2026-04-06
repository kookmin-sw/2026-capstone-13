package com.helpboys.api.dto;

import com.helpboys.api.entity.Meal;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.Map;
import java.util.stream.Collectors;

@Getter
@Builder
public class MealResponse {

    private Long id;
    private LocalDate mealDate;
    private String cafeteria;   // 사용자 언어로 번역된 식당명
    private String corner;      // 사용자 언어로 번역된 코너명
    private String cafeteriaKo; // 한국어 원문 식당명
    private String cornerKo;    // 한국어 원문 코너명
    private String menu;        // 한국어 원문 메뉴 (번역 없음)

    public static MealResponse from(Meal meal, String langCode) {
        Map<String, com.helpboys.api.entity.MealTranslation> translationMap = meal.getTranslations().stream()
                .collect(Collectors.toMap(t -> t.getLangCode(), t -> t, (a, b) -> a));

        com.helpboys.api.entity.MealTranslation t = translationMap.getOrDefault(langCode,
                translationMap.get("en"));

        String cafeteria = (t != null) ? t.getCafeteria() : meal.getCafeteria();
        String corner    = (t != null) ? t.getCorner()    : meal.getCorner();
        String menu      = (t != null && t.getMenu() != null) ? t.getMenu() : meal.getMenu();

        return MealResponse.builder()
                .id(meal.getId())
                .mealDate(meal.getMealDate())
                .cafeteria(cafeteria)
                .corner(corner)
                .cafeteriaKo(meal.getCafeteria())
                .cornerKo(meal.getCorner())
                .menu(menu)
                .build();
    }
}