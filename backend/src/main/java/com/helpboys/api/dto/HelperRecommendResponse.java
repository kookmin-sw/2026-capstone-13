package com.helpboys.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class HelperRecommendResponse {
    private UserResponse helper;
    private String matchReason;
}