package com.helpboys.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.helpboys.api.dto.CommunityPostRequest;
import com.helpboys.api.dto.CommunityPostResponse;
import com.helpboys.api.dto.PostCommentResponse;
import com.helpboys.api.entity.CommunityPost;
import com.helpboys.api.entity.Notification;
import com.helpboys.api.entity.PostComment;
import com.helpboys.api.entity.CommentTranslation;
import com.helpboys.api.entity.PostLike;
import com.helpboys.api.entity.PostTranslation;
import com.helpboys.api.entity.User;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.CommunityPostRepository;
import com.helpboys.api.repository.CommentTranslationRepository;
import com.helpboys.api.repository.PostCommentRepository;
import com.helpboys.api.repository.PostLikeRepository;
import com.helpboys.api.repository.PostTranslationRepository;
import com.helpboys.api.repository.UserBlockRepository;
import com.helpboys.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommunityService {

    private final CommunityPostRepository communityPostRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostTranslationRepository postTranslationRepository;
    private final CommentTranslationRepository commentTranslationRepository;
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final NotificationService notificationService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(5))
            .build();

    @Value("${ai.server.url:http://localhost:8000}")
    private String aiServerUrl;

    // 게시글 목록 조회 (차단 유저 제외, 페이지네이션)
    @Transactional(readOnly = true)
    public Page<CommunityPostResponse> getAllPosts(Long userId, int page, int size) {
        List<Long> blockedIds = userBlockRepository.findBlockedIdsByBlockerId(userId);
        List<Long> excludeIds = blockedIds.isEmpty() ? List.of(-1L) : blockedIds;
        Page<CommunityPost> posts = communityPostRepository.findAllExcludingBlocked(excludeIds, PageRequest.of(page, size));

        List<Long> postIds = posts.stream().map(CommunityPost::getId).collect(Collectors.toList());
        Set<Long> likedPostIds = postIds.isEmpty() ? Set.of() : postLikeRepository.findLikedPostIds(postIds, userId);

        return posts.map(post -> CommunityPostResponse.fromList(post, likedPostIds.contains(post.getId())));
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
            try {
                String message = author.getNickname() + "님이 '" +
                        truncate(post.getTitle(), 15) + "' 에 댓글을 달았어요.";
                notificationService.createNotification(
                        post.getAuthor().getId(),
                        Notification.NotificationType.COMMENT,
                        message,
                        postId,
                        Notification.ReferenceType.POST
                );
            } catch (Exception e) {
                log.warn("[알림 생성 실패] 댓글 알림: {}", e.getMessage());
            }
        }

        return PostCommentResponse.from(saved);
    }

    // 좋아요 토글
    @Transactional
    public Map<String, Object> toggleLike(Long postId, Long userId) {
        CommunityPost post = findPostById(postId);

        java.util.Optional<PostLike> existingLike = postLikeRepository.findByPostIdAndUserId(postId, userId);

        if (existingLike.isPresent()) {
            postLikeRepository.delete(existingLike.get());
            communityPostRepository.decrementLikes(postId);
            return Map.of("liked", false, "likes", post.getLikes() - 1);
        } else {
            User user = findUserById(userId);
            PostLike like = PostLike.builder().post(post).user(user).build();
            postLikeRepository.save(like);
            communityPostRepository.incrementLikes(postId);

            // 내 글이 아닌 경우 게시글 작성자에게 알림
            if (!post.getAuthor().getId().equals(userId)) {
                try {
                    String message = user.getNickname() + "님이 '" +
                            truncate(post.getTitle(), 15) + "' 글을 좋아해요.";
                    notificationService.createNotification(
                            post.getAuthor().getId(),
                            Notification.NotificationType.LIKE,
                            message,
                            postId,
                            Notification.ReferenceType.POST
                    );
                } catch (Exception e) {
                    log.warn("[알림 생성 실패] 좋아요 알림: {}", e.getMessage());
                }
            }
            return Map.of("liked", true, "likes", post.getLikes() + 1);
        }
    }

    // 게시글 수정
    @Transactional
    public CommunityPostResponse updatePost(Long postId, CommunityPostRequest request, Long userId) {
        CommunityPost post = findPostById(postId);
        if (!post.getAuthor().getId().equals(userId)) {
            throw new BusinessException("수정 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
        post.setCategory(request.getCategory());
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setImages(request.getImages() == null ? "" : String.join(",", request.getImages()));
        CommunityPost saved = communityPostRepository.save(post);
        return CommunityPostResponse.fromList(saved, postLikeRepository.existsByPostIdAndUserId(postId, userId));
    }

    // 게시글 삭제
    @Transactional
    public void deletePost(Long postId, Long userId) {
        CommunityPost post = findPostById(postId);
        if (!post.getAuthor().getId().equals(userId)) {
            throw new BusinessException("삭제 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
        communityPostRepository.delete(post);
    }

    // 대댓글 추가
    @Transactional
    public PostCommentResponse addReply(Long parentCommentId, String content, Long userId) {
        PostComment parent = postCommentRepository.findById(parentCommentId)
                .orElseThrow(() -> new BusinessException("댓글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        User author = findUserById(userId);

        PostComment reply = PostComment.builder()
                .post(parent.getPost())
                .author(author)
                .content(content)
                .parentComment(parent)
                .build();

        PostComment saved = postCommentRepository.save(reply);

        // 내 댓글이 아닌 경우 원댓글 작성자에게 알림
        if (!parent.getAuthor().getId().equals(userId)) {
            try {
                String message = author.getNickname() + "님이 회원님의 댓글에 답글을 달았어요.";
                notificationService.createNotification(
                        parent.getAuthor().getId(),
                        Notification.NotificationType.REPLY,
                        message,
                        parent.getPost().getId(),
                        Notification.ReferenceType.POST
                );
            } catch (Exception e) {
                log.warn("[알림 생성 실패] 대댓글 알림: {}", e.getMessage());
            }
        }

        return PostCommentResponse.from(saved);
    }

    // 대댓글 조회
    @Transactional(readOnly = true)
    public List<PostCommentResponse> getReplies(Long parentCommentId) {
        return postCommentRepository.findByParentCommentIdOrderByCreatedAtAsc(parentCommentId)
                .stream()
                .map(PostCommentResponse::from)
                .collect(Collectors.toList());
    }

    // 댓글 삭제
    @Transactional
    public void deleteComment(Long commentId, Long userId) {
        PostComment comment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException("댓글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        if (!comment.getAuthor().getId().equals(userId)) {
            throw new BusinessException("삭제 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
        postCommentRepository.delete(comment);
    }

    // 게시글 검색 (차단 유저 제외, 페이지네이션)
    @Transactional(readOnly = true)
    public Page<CommunityPostResponse> searchPosts(String keyword, Long userId, int page, int size) {
        List<Long> blockedIds = userBlockRepository.findBlockedIdsByBlockerId(userId);
        List<Long> excludeIds = blockedIds.isEmpty() ? List.of(-1L) : blockedIds;
        Page<CommunityPost> posts = communityPostRepository.searchByKeywordExcludingBlocked(keyword, excludeIds, PageRequest.of(page, size));

        List<Long> postIds = posts.stream().map(CommunityPost::getId).collect(Collectors.toList());
        Set<Long> likedPostIds = postIds.isEmpty() ? Set.of() : postLikeRepository.findLikedPostIds(postIds, userId);

        return posts.map(post -> CommunityPostResponse.fromList(post, likedPostIds.contains(post.getId())));
    }

    // 게시글 번역 (DB 캐시 → 없으면 Gemini 번역 후 저장)
    public Map<String, String> translatePost(Long postId, String langCode) {
        // DB 캐시 확인
        java.util.Optional<PostTranslation> cached =
                postTranslationRepository.findByPostIdAndLangCode(postId, langCode);
        if (cached.isPresent()) {
            return Map.of("title", cached.get().getTitle(),
                          "content", cached.get().getContent(),
                          "langCode", langCode);
        }

        CommunityPost post = findPostById(postId);
        String translatedTitle = callTranslate(post.getTitle(), langCode);
        String translatedContent = callTranslate(post.getContent(), langCode);

        postTranslationRepository.save(PostTranslation.builder()
                .post(post)
                .langCode(langCode)
                .title(translatedTitle)
                .content(translatedContent)
                .build());

        return Map.of("title", translatedTitle, "content", translatedContent, "langCode", langCode);
    }

    // 댓글 번역 (DB 캐시 → 없으면 번역 후 저장)
    @Transactional
    public Map<String, String> translateComment(Long commentId, String langCode) {
        // DB 캐시 확인
        java.util.Optional<CommentTranslation> cached =
                commentTranslationRepository.findByCommentIdAndLangCode(commentId, langCode);
        if (cached.isPresent()) {
            return Map.of("content", cached.get().getContent(), "langCode", langCode);
        }

        PostComment comment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException("댓글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        String translatedContent = callTranslate(comment.getContent(), langCode);

        commentTranslationRepository.save(CommentTranslation.builder()
                .comment(comment)
                .langCode(langCode)
                .content(translatedContent)
                .build());

        return Map.of("content", translatedContent, "langCode", langCode);
    }

    private String callTranslate(String text, String langCode) {
        try {
            String body = objectMapper.writeValueAsString(
                    Map.of("text", text, "target_lang", langCode, "source_lang", "ko"));
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(aiServerUrl + "/api/gemini/translate"))
                    .header("Content-Type", "application/json")
                    .timeout(java.time.Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode result = objectMapper.readTree(resp.body());
            if (!result.path("success").asBoolean()) {
                throw new BusinessException("번역에 실패했습니다: " + result.path("message").asText("Gemini 오류"), HttpStatus.SERVICE_UNAVAILABLE);
            }
            return result.path("data").path("translated").asText();
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[번역] 실패: {}", e.getMessage());
            throw new BusinessException("번역 서버 연결에 실패했습니다", HttpStatus.SERVICE_UNAVAILABLE);
        }
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
