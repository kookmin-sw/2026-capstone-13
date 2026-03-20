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
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<CommunityPostResponse> getAllPosts(Long userId) {
        return communityPostRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(post -> CommunityPostResponse.fromList(
                        post,
                        userId != null && postLikeRepository.existsByPostIdAndUserId(post.getId(), userId),
                        (int) postCommentRepository.countByPostId(post.getId())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CommunityPostResponse getPostById(Long postId, Long userId) {
        CommunityPost post = communityPostRepository.findByIdWithDetails(postId)
                .orElseThrow(() -> new BusinessException("게시글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        boolean liked = userId != null && postLikeRepository.existsByPostIdAndUserId(postId, userId);
        return CommunityPostResponse.fromDetail(post, liked);
    }

    @Transactional
    public CommunityPostResponse createPost(CommunityPostRequest request, Long userId) {
        User author = findUserById(userId);
        String images = request.getImages() == null ? "" : String.join(",", request.getImages());

        CommunityPost post = CommunityPost.builder()
                .category(request.getCategory())
                .title(request.getTitle())
                .content(request.getContent())
                .images(images)
                .author(author)
                .build();

        CommunityPost saved = communityPostRepository.save(post);
        return CommunityPostResponse.fromList(saved, false, 0);
    }

    @Transactional
    public PostCommentResponse addComment(Long postId, String content, Long userId) {
        CommunityPost post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new BusinessException("게시글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        User author = findUserById(userId);

        PostComment comment = PostComment.builder()
                .post(post)
                .author(author)
                .content(content)
                .build();
        PostComment saved = postCommentRepository.save(comment);

        if (!post.getAuthor().getId().equals(userId)) {
            String message = author.getNickname() + "님이 '" + truncate(post.getTitle(), 15) + "' 에 댓글을 달았어요.";
            notificationService.createNotification(post.getAuthor().getId(), Notification.NotificationType.COMMENT, message, postId);
        }

        return PostCommentResponse.from(saved);
    }

    @Transactional
    public Map<String, Object> toggleLike(Long postId, Long userId) {
        CommunityPost post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new BusinessException("게시글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        boolean alreadyLiked = postLikeRepository.existsByPostIdAndUserId(postId, userId);
        if (alreadyLiked) {
            postLikeRepository.findByPostIdAndUserId(postId, userId).ifPresent(postLikeRepository::delete);
            post.setLikes(post.getLikes() - 1);
        } else {
            User user = findUserById(userId);
            postLikeRepository.save(PostLike.builder().post(post).user(user).build());
            post.setLikes(post.getLikes() + 1);
        }
        communityPostRepository.save(post);
        return Map.of("liked", !alreadyLiked, "likes", post.getLikes());
    }

    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}
