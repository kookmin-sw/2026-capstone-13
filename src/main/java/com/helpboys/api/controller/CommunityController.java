package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.CommunityPostRequest;
import com.helpboys.api.dto.CommunityPostResponse;
import com.helpboys.api.dto.PostCommentResponse;
import com.helpboys.api.service.CommunityService;
import com.helpboys.api.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;
    private final JwtUtil jwtUtil;

    // GET /api/community - 게시글 목록
    @GetMapping
    public ResponseEntity<ApiResponse<List<CommunityPostResponse>>> getAllPosts(
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", communityService.getAllPosts(userId)));
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

    private Long extractUserId(String bearerToken) {
        return jwtUtil.extractUserId(bearerToken.replace("Bearer ", ""));
    }
}
