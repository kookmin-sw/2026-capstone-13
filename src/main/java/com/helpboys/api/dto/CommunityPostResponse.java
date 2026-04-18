package com.helpboys.api.dto;

import com.helpboys.api.entity.CommunityPost;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Comparator;

@Getter
@AllArgsConstructor
@Builder
public class CommunityPostResponse {

    private Long id;
    private String category;
    private String title;
    private String content;
    private List<String> images;
    private Long authorId;
    private String author;
    private String authorProfileImage;
    private String university;
    private String userType;
    private String authorNationality;
    private Integer likes;
    private Integer comments;
    private List<PostCommentResponse> commentList;
    private boolean liked;
    private String createdAt;

    // 최상위 댓글만 필터링 + replyCount 포함
    private static List<PostCommentResponse> buildTopLevelComments(List<com.helpboys.api.entity.PostComment> all) {
        java.util.Map<Long, Long> replyCounts = all.stream()
                .filter(c -> c.getParentComment() != null)
                .collect(Collectors.groupingBy(c -> c.getParentComment().getId(), Collectors.counting()));

        return all.stream()
                .filter(c -> c.getParentComment() == null)
                .sorted(Comparator.comparing(c -> c.getCreatedAt()))
                .map(c -> PostCommentResponse.from(c, replyCounts.getOrDefault(c.getId(), 0L).intValue()))
                .collect(Collectors.toList());
    }

    // 목록용 (최근 댓글 없음, 댓글 수만 포함)
    public static CommunityPostResponse fromList(CommunityPost post, boolean liked) {
        long topLevelCount = post.getCommentList().stream()
                .filter(c -> c.getParentComment() == null).count();

        return CommunityPostResponse.builder()
                .id(post.getId())
                .category(post.getCategory().name())
                .title(post.getTitle())
                .content(post.getContent())
                .images(parseImages(post.getImages()))
                .authorId(post.getAuthor().getId())
                .author(post.getAuthor().getNickname())
                .authorProfileImage(post.getAuthor().getProfileImage())
                .university(post.getAuthor().getUniversity())
                .userType(post.getAuthor().getUserType().name())
                .authorNationality(post.getAuthor().getNationality())
                .likes(post.getLikes())
                .comments((int) topLevelCount)
                .commentList(Collections.emptyList())
                .liked(liked)
                .createdAt(post.getCreatedAt().toString())
                .build();
    }

    // 상세용 (최상위 댓글 + replyCount 포함)
    public static CommunityPostResponse fromDetail(CommunityPost post, boolean liked) {
        return fromDetail(post, liked, java.util.Set.of());
    }

    // 상세용 + 차단 유저 댓글 제외
    public static CommunityPostResponse fromDetail(CommunityPost post, boolean liked, java.util.Set<Long> blockedIds) {
        List<com.helpboys.api.entity.PostComment> filtered = blockedIds.isEmpty()
                ? post.getCommentList()
                : post.getCommentList().stream()
                        .filter(c -> !blockedIds.contains(c.getAuthor().getId()))
                        .collect(Collectors.toList());

        long topLevelCount = filtered.stream()
                .filter(c -> c.getParentComment() == null).count();

        return CommunityPostResponse.builder()
                .id(post.getId())
                .category(post.getCategory().name())
                .title(post.getTitle())
                .content(post.getContent())
                .images(parseImages(post.getImages()))
                .authorId(post.getAuthor().getId())
                .author(post.getAuthor().getNickname())
                .authorProfileImage(post.getAuthor().getProfileImage())
                .university(post.getAuthor().getUniversity())
                .userType(post.getAuthor().getUserType().name())
                .authorNationality(post.getAuthor().getNationality())
                .likes(post.getLikes())
                .comments((int) topLevelCount)
                .commentList(buildTopLevelComments(filtered))
                .liked(liked)
                .createdAt(post.getCreatedAt().toString())
                .build();
    }

    private static List<String> parseImages(String images) {
        if (images == null || images.isBlank()) return Collections.emptyList();
        return Arrays.asList(images.split(","));
    }
}
