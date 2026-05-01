package com.helpboys.api.dto;

import com.helpboys.api.entity.Report;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class ReportResponse {

    private Long id;
    private UserResponse reporter;
    private UserResponse targetUser;
    private String targetType;
    private Long targetId;
    private String reason;
    private String status;
    private String createdAt;

    public static ReportResponse from(Report report) {
        return ReportResponse.builder()
                .id(report.getId())
                .reporter(UserResponse.from(report.getReporter()))
                .targetUser(UserResponse.from(report.getTargetUser()))
                .targetType(report.getTargetType().name())
                .targetId(report.getTargetId())
                .reason(report.getReason())
                .status(report.getStatus().name())
                .createdAt(report.getCreatedAt().toString())
                .build();
    }
}