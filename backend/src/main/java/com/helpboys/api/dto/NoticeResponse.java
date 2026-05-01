package com.helpboys.api.dto;

import com.helpboys.api.entity.Notice;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.Map;
import java.util.stream.Collectors;

@Getter
@Builder
public class NoticeResponse {

    private Long id;
    private String categoryId;
    private String categoryName;
    private String titleKo;
    private String title;      // 사용자 언어로 번역된 제목
    private String link;
    private LocalDate pubDate;

    public static NoticeResponse from(Notice notice, String langCode) {
        Map<String, String> translations = notice.getTranslations().stream()
                .collect(Collectors.toMap(t -> t.getLangCode(), t -> t.getTitle(), (a, b) -> a));

        String translatedTitle = translations.getOrDefault(langCode,
                translations.getOrDefault("en", notice.getTitleKo()));

        return NoticeResponse.builder()
                .id(notice.getId())
                .categoryId(notice.getCategoryId())
                .categoryName(notice.getCategoryName())
                .titleKo(notice.getTitleKo())
                .title(translatedTitle)
                .link(notice.getLink())
                .pubDate(notice.getPubDate())
                .build();
    }
}
