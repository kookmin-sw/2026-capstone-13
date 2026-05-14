package com.helpboys.api.dto;

import com.helpboys.api.entity.Report;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReportRequest {

    @NotNull(message = "신고 대상 유저 ID를 입력해주세요.")
    private Long targetUserId;

    @NotNull(message = "신고 타입을 선택해주세요.")
    private Report.TargetType targetType;

    // USER 신고 시 null 가능, POST/HELP_REQUEST 신고 시 필수
    private Long targetId;

    @NotBlank(message = "신고 사유를 입력해주세요.")
    private String reason;
}