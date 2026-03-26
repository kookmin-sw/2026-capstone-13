package com.helpboys.api.service;

import com.helpboys.api.dto.CommunityPostRequest;
import com.helpboys.api.dto.CommunityPostResponse;
import com.helpboys.api.dto.PostCommentResponse;
import com.helpboys.api.entity.CommunityPost;
import com.helpboys.api.entity.Notification;
import com.helpboys.api.entity.PostComment;
import com.helpboys.api.entity.PostLike;
import com.helpboys.api.entity.User;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.CommunityPostRepository;
import com.helpboys.api.repository.PostCommentRepository;
import com.helpboys.api.repository.PostLikeRepository;
import com.helpboys.api.repository.UserBlockRepository;
import com.helpboys.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private final CommunityPostRepository communityPostRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostLikeRepository postLikeRepository;
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final NotificationService notificationService;

    // 게시글 목록 조회 (차단 유저 제외)
    @Transactional(readOnly = true)
    public List<CommunityPostResponse> getAllPosts(Long userId) {
        List<Long> blockedIds = userBlockRepository.findBlockedIdsByBlockerId(userId);
        return communityPostRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(post -> !blockedIds.contains(post.getAuthor().getId()))
                .map(post -> CommunityPostResponse.fromList(post,
                        postLikeRepository.existsByPostIdAndUserId(post.getId(), userId)))
                .collect(Collectors.toList());
    }

    // 게시글 상세 조회 (댓글 포함)
    @Transactional(readOnly = true)
    public CommunityPostResponse getPostById(Long postId, Long userId) {
        CommunityPost post = findPostById(postId);
        boolean liked = postLikeRepository.existsByPostIdAndUserId(postId, userId);
        return CommunityPostResponse.fromDetail(post, liked);
    }

    // 게시글 작성
    @Transactional
    public CommunityPostResponse createPost(CommunityPostRequest request, Long userId) {
        User author = findUserById(userId);
        String images = request.getImages() == null ? "" :
                String.join(",", request.getImages());

        CommunityPost post = CommunityPost.builder()
                .category(request.getCategory())
                .title(request.getTitle())
                .content(request.getContent())
                .images(images)
                .author(author)
                .build();

        CommunityPost saved = communityPostRepository.save(post);
        return CommunityPostResponse.fromList(saved, false);
    }

    // 댓글 추가
    @Transactional
    public PostCommentResponse addComment(Long postId, String content, Long userId) {
        CommunityPost post = findPostById(postId);
        User author = findUserById(userId);

        PostComment comment = PostComment.builder()
                .post(post)
                .author(author)
                .content(content)
                .build();

        PostComment saved = postCommentRepository.save(comment);

        // 내 글이 아닌 경우 게시글 작성자에게 알림
        if (!post.getAuthor().getId().equals(userId)) {
            String message = author.getNickname() + "님이 '" +
                    truncate(post.getTitle(), 15) + "' 에 댓글을 달았어요.";
            notificationService.createNotification(
                    post.getAuthor().getId(),
                    Notification.NotificationType.COMMENT,
                    message,
                    postId
            );
        }

        return PostCommentResponse.from(saved);
    }

    // 좋아요 토글
    @Transactional
    public Map<String, Object> toggleLike(Long postId, Long userId) {
        CommunityPost post = findPostById(postId);

        boolean alreadyLiked = postLikeRepository.existsByPostIdAndUserId(postId, userId);

        if (alreadyLiked) {
            postLikeRepository.findByPostIdAndUserId(postId, userId)
                    .ifPresent(postLikeRepository::delete);
            post.setLikes(post.getLikes() - 1);
        } else {
            User user = findUserById(userId);
            PostLike like = PostLike.builder().post(post).user(user).build();
            postLikeRepository.save(like);
            post.setLikes(post.getLikes() + 1);

            // 내 글이 아닌 경우 게시글 작성자에게 알림
            if (!post.getAuthor().getId().equals(userId)) {
                String message = user.getNickname() + "님이 '" +
                        truncate(post.getTitle(), 15) + "' 글을 좋아해요.";
                notificationService.createNotification(
                        post.getAuthor().getId(),
                        Notification.NotificationType.LIKE,
                        message,
                        postId
                );
            }
        }

        communityPostRepository.save(post);
        return Map.of("liked", !alreadyLiked, "likes", post.getLikes());
    }

    // 게시글 검색 (차단 유저 제외)
    @Transactional(readOnly = true)
    public List<CommunityPostResponse> searchPosts(String keyword, Long userId) {
        List<Long> blockedIds = userBlockRepository.findBlockedIdsByBlockerId(userId);
        return communityPostRepository.searchByKeyword(keyword)
                .stream()
                .filter(post -> !blockedIds.contains(post.getAuthor().getId()))
                .map(post -> CommunityPostResponse.fromList(post,
                        postLikeRepository.existsByPostIdAndUserId(post.getId(), userId)))
                .collect(Collectors.toList());
    }

    private CommunityPost findPostById(Long postId) {
        return communityPostRepository.findById(postId)
                .orElseThrow(() -> new BusinessException("게시글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}
