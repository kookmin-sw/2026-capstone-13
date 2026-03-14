package com.helpboys.api.dto;

import com.helpboys.api.entity.HelpRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class HelpRequestResponse {

    private Long id;
    private String title;
    private String description;
    private String category;
    private String helpMethod;
    private String status;
    private UserResponse requester;
    private UserResponse helper;
    private String createdAt;
    private String updatedAt;

    public static HelpRequestResponse from(HelpRequest req) {
        return HelpRequestResponse.builder()
                .id(req.getId())
                .title(req.getTitle())
                .description(req.getDescription())
                .category(req.getCategory().name())
                .helpMethod(req.getHelpMethod().name())
                .status(req.getStatus().name())
                .requester(UserResponse.from(req.getRequester()))
                .helper(req.getHelper() != null ? UserResponse.from(req.getHelper()) : null)
                .createdAt(req.getCreatedAt().toString())
                .updatedAt(req.getUpdatedAt().toString())
                .build();
    }
}
