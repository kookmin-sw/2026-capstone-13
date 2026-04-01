package com.helpboys.api.dto;

import com.helpboys.api.entity.PostComment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class PostCommentResponse {

    private Long id;
    private String author;
    private String authorProfileImage;
    private String userType;
    private String content;
    private String createdAt;

    public static PostCommentResponse from(PostComment comment) {
        return PostCommentResponse.builder()
                .id(comment.getId())
                .author(comment.getAuthor().getNickname())
                .authorProfileImage(comment.getAuthor().getProfileImage())
                .userType(comment.getAuthor().getUserType().name())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt().toString())
                .build();
    }
}
