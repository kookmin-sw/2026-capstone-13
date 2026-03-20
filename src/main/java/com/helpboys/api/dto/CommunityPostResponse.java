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
    private String university;
    private String userType;
    private Integer likes;
    private Integer comments;
    private List<PostCommentResponse> commentList;
    private boolean liked;
    private String createdAt;

    // 목록용 - author JOIN FETCH 필수, commentCount는 별도 count 쿼리로 전달
    public static CommunityPostResponse fromList(CommunityPost post, boolean liked, int commentCount) {
        return CommunityPostResponse.builder()
                .id(post.getId())
                .category(post.getCategory().name())
                .title(post.getTitle())
                .content(post.getContent())
                .images(parseImages(post.getImages()))
                .author(post.getAuthor().getNickname())
                .university(post.getAuthor().getUniversity())
                .userType(post.getAuthor().getUserType().name())
                .likes(post.getLikes())
                .comments(commentCount)
                .commentList(Collections.emptyList())
                .liked(liked)
                .createdAt(post.getCreatedAt().toString())
                .build();
    }

    // 상세용 - findByIdWithDetails로 모든 연관 엔티티 JOIN FETCH 후 호출
    public static CommunityPostResponse fromDetail(CommunityPost post, boolean liked) {
        List<PostCommentResponse> comments = post.getCommentList().stream()
                .map(PostCommentResponse::from)
                .collect(Collectors.toList());
        return CommunityPostResponse.builder()
                .id(post.getId())
                .category(post.getCategory().name())
                .title(post.getTitle())
                .content(post.getContent())
                .images(parseImages(post.getImages()))
                .author(post.getAuthor().getNickname())
                .university(post.getAuthor().getUniversity())
                .userType(post.getAuthor().getUserType().name())
                .likes(post.getLikes())
                .comments(comments.size())
                .commentList(comments)
                .liked(liked)
                .createdAt(post.getCreatedAt().toString())
                .build();
    }

    private static List<String> parseImages(String images) {
        if (images == null || images.isBlank()) return Collections.emptyList();
        return Arrays.asList(images.split(","));
    }
}
