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

    @GetMapping
    public ResponseEntity<ApiResponse<List<CommunityPostResponse>>> getAllPosts(
            @RequestHeader(value = "Authorization", required = false) String token) {
        Long userId = extractUserIdOptional(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", communityService.getAllPosts(userId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CommunityPostResponse>> getPostById(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String token) {
        Long userId = extractUserIdOptional(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", communityService.getPostById(id, userId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CommunityPostResponse>> createPost(
            @Valid @RequestBody CommunityPostRequest request,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("게시글이 등록되었습니다.", communityService.createPost(request, userId)));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<PostCommentResponse>> addComment(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("댓글이 등록되었습니다.", communityService.addComment(id, body.get("content"), userId)));
    }

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

    private Long extractUserIdOptional(String bearerToken) {
        if (bearerToken == null || bearerToken.isBlank()) return null;
        try {
            return jwtUtil.extractUserId(bearerToken.replace("Bearer ", ""));
        } catch (Exception e) {
            return null;
        }
    }
}
