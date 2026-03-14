package com.helpboys.api.dto;

import com.helpboys.api.entity.HelpRequest;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class HelpRequestRequest {

    @NotBlank(message = "제목을 입력해주세요.")
    private String title;

    @NotBlank(message = "내용을 입력해주세요.")
    private String description;

    @NotNull(message = "카테고리를 선택해주세요.")
    private HelpRequest.HelpCategory category;

    @NotNull(message = "도움 방식을 선택해주세요.")
    private HelpRequest.HelpMethod helpMethod;
}
