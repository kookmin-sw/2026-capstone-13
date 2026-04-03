package com.helpboys.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDto {

    private Long roomId;
    private Long senderId;
    private String senderNickname;
    private String content;
    private String originalLanguage;
    private String translatedContent;
    private String culturalNote;
    private String createdAt;
    @JsonProperty("isRead")
    private boolean isRead;   // 읽음 여부 (false = 안읽음 → 클라이언트에서 "1" 표시)
}
