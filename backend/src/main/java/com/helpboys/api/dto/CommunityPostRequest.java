package com.helpboys.api.dto;

import com.helpboys.api.entity.CommunityPost;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class CommunityPostRequest {

    @NotNull
    private CommunityPost.PostCategory category;

    @NotBlank
    private String title;

    @NotBlank
    private String content;

    private List<String> images;
}
