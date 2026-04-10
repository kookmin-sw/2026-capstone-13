package com.helpboys.api.dto;

import com.helpboys.api.entity.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class NotificationResponse {

    private Long id;
    private String type;
    private String message;
    private Long referenceId;
    private String referenceType;
    private boolean isRead;
    private String createdAt;

    public static NotificationResponse from(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType().name())
                .message(n.getMessage())
                .referenceId(n.getReferenceId())
                .referenceType(n.getReferenceType() != null ? n.getReferenceType().name() : null)
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt().toString())
                .build();
    }
}
