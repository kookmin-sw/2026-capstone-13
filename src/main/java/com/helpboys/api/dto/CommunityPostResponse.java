package com.helpboys.api.dto;

import com.helpboys.api.entity.CommunityPost;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@AllArgsConstructor
@Builder
public class CommunityPostResponse {

    private Long id;
    private String category;
    private String title;
    private String content;
    private List<String> images;
    private String author;
    private String authorProfileImage;
    private String university;
    private String userType;
    private Integer likes;
    private Integer comments;
    private List<PostCommentResponse> commentList;
    private boolean liked;
    private String createdAt;

    // 목록용 (댓글 미포함)
    public static CommunityPostResponse fromList(CommunityPost post, boolean liked) {
        return CommunityPostResponse.builder()
                .id(post.getId())
                .category(post.getCategory().name())
                .title(post.getTitle())
                .content(post.getContent())
                .images(parseImages(post.getImages()))
                .author(post.getAuthor().getNickname())
                .authorProfileImage(post.getAuthor().getProfileImage())
                .university(post.getAuthor().getUniversity())
                .userType(post.getAuthor().getUserType().name())
                .likes(post.getLikes())
                .comments(post.getCommentList().size())
                .commentList(Collections.emptyList())
                .liked(liked)
                .createdAt(post.getCreatedAt().toString())
                .build();
    }

    // 상세용 (댓글 포함)
    public static CommunityPostResponse fromDetail(CommunityPost post, boolean liked) {
        return CommunityPostResponse.builder()
                .id(post.getId())
                .category(post.getCategory().name())
                .title(post.getTitle())
                .content(post.getContent())
                .images(parseImages(post.getImages()))
                .author(post.getAuthor().getNickname())
                .authorProfileImage(post.getAuthor().getProfileImage())
                .university(post.getAuthor().getUniversity())
                .userType(post.getAuthor().getUserType().name())
                .likes(post.getLikes())
                .comments(post.getCommentList().size())
                .commentList(post.getCommentList().stream()
                        .map(PostCommentResponse::from)
                        .collect(Collectors.toList()))
                .liked(liked)
                .createdAt(post.getCreatedAt().toString())
                .build();
    }

    private static List<String> parseImages(String images) {
        if (images == null || images.isBlank()) return Collections.emptyList();
        return Arrays.asList(images.split(","));
    }
}
