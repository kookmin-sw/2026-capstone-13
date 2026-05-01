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
    private Long parentCommentId;
    private Long authorId;
    private String author;
    private String authorProfileImage;
    private String userType;
    private String content;
    private String createdAt;
    private int replyCount;

    public static PostCommentResponse from(PostComment comment) {
        return from(comment, 0);
    }

    public static PostCommentResponse from(PostComment comment, int replyCount) {
        return PostCommentResponse.builder()
                .id(comment.getId())
                .parentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null)
                .authorId(comment.getAuthor().getId())
                .author(comment.getAuthor().getNickname())
                .authorProfileImage(comment.getAuthor().getProfileImage())
                .userType(comment.getAuthor().getUserType().name())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt().toString())
                .replyCount(replyCount)
                .build();
    }
}
