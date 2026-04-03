package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.CommunityPostRequest;
import com.helpboys.api.dto.CommunityPostResponse;
import com.helpboys.api.dto.PostCommentResponse;
import com.helpboys.api.repository.UserRepository;
import com.helpboys.api.service.CommunityService;
import com.helpboys.api.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    // GET /api/community - 게시글 목록
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CommunityPostResponse>>> getAllPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", communityService.getAllPosts(userId, page, size)));
    }

    // GET /api/community/{id} - 게시글 상세 (댓글 포함)
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CommunityPostResponse>> getPostById(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", communityService.getPostById(id, userId)));
    }

    // POST /api/community - 게시글 작성
    @PostMapping
    public ResponseEntity<ApiResponse<CommunityPostResponse>> createPost(
            @Valid @RequestBody CommunityPostRequest request,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("게시글이 등록되었습니다.", communityService.createPost(request, userId)));
    }

    // POST /api/community/{id}/comments - 댓글 추가
    @PostMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<PostCommentResponse>> addComment(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("댓글이 등록되었습니다.",
                        communityService.addComment(id, body.get("content"), userId)));
    }

    // POST /api/community/{id}/like - 좋아요 토글
    @PostMapping("/{id}/like")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleLike(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("처리 완료", communityService.toggleLike(id, userId)));
    }

    // PUT /api/community/{id} - 게시글 수정
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CommunityPostResponse>> updatePost(
            @PathVariable Long id,
            @Valid @RequestBody CommunityPostRequest request,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("게시글이 수정되었습니다.", communityService.updatePost(id, request, userId)));
    }

    // DELETE /api/community/{id} - 게시글 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        communityService.deletePost(id, userId);
        return ResponseEntity.ok(ApiResponse.success("게시글이 삭제되었습니다.", null));
    }

    // DELETE /api/community/comments/{commentId} - 댓글 삭제
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long commentId,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        communityService.deleteComment(commentId, userId);
        return ResponseEntity.ok(ApiResponse.success("댓글이 삭제되었습니다.", null));
    }

    // GET /api/community/{id}/translate?lang=en - 게시글 번역 (캐시)
    @GetMapping("/{id}/translate")
    public ResponseEntity<ApiResponse<Map<String, String>>> translatePost(
            @PathVariable Long id,
            @RequestParam(required = false) String lang,
            @RequestHeader("Authorization") String token) {
        String langCode = resolveLang(lang, token);
        return ResponseEntity.ok(ApiResponse.success("번역 완료", communityService.translatePost(id, langCode)));
    }

    // GET /api/community/search?keyword=... - 게시글 검색
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<CommunityPostResponse>>> searchPosts(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("검색 성공", communityService.searchPosts(keyword, userId, page, size)));
    }

    private Long extractUserId(String bearerToken) {
        return jwtUtil.extractUserId(bearerToken.replace("Bearer ", ""));
    }

    private String resolveLang(String queryLang, String token) {
        if (queryLang != null && !queryLang.isBlank()) return queryLang;
        try {
            Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
            return userRepository.findById(userId)
                    .map(u -> u.getPreferredLanguage() != null ? u.getPreferredLanguage() : "en")
                    .orElse("en");
        } catch (Exception ignored) {}
        return "en";
    }
}
