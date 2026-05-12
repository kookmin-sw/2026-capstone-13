package com.helpboys.api.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Getter
@NoArgsConstructor
public class HelperRecommendRequest {
    private List<Long> excludeHelperIds = new ArrayList<>();
}
