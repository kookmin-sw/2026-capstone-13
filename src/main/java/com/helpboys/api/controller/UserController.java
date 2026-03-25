package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.UserResponse;
import com.helpboys.api.service.UserService;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    // GET /api/users/me - 내 프로필 조회
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getMyProfile(
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        return ResponseEntity.ok(ApiResponse.success("조회 성공", userService.getUserById(userId)));
    }

    // GET /api/users/{id} - 다른 사용자 프로필 조회
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("조회 성공", userService.getUserById(id)));
    }

    // PATCH /api/users/bio - 자기소개 수정
    @PatchMapping("/bio")
    public ResponseEntity<ApiResponse<UserResponse>> updateBio(
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        return ResponseEntity.ok(ApiResponse.success("수정 완료", userService.updateBio(userId, body.get("bio"))));
    }

    // PATCH /api/users/profile - 프로필 상세 수정 (bio, gender, age, major, mbti, hobbies)
    @PatchMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        return ResponseEntity.ok(ApiResponse.success("수정 완료", userService.updateProfile(userId, body)));
    }

    // DELETE /api/users/profile-image - 프로필 이미지 삭제
    @DeleteMapping("/profile-image")
    public ResponseEntity<ApiResponse<UserResponse>> deleteProfileImage(
            @RequestHeader("Authorization") String token) throws IOException {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        UserResponse current = userService.getUserById(userId);
        if (current.getProfileImage() != null && current.getProfileImage().startsWith("/uploads/")) {
            Path filePath = Paths.get(current.getProfileImage().substring(1));
            Files.deleteIfExists(filePath);
        }
        return ResponseEntity.ok(ApiResponse.success("삭제 완료", userService.updateProfileImage(userId, null)));
    }

    // POST /api/users/profile-image - 프로필 이미지 업로드
    @PostMapping("/profile-image")
    public ResponseEntity<ApiResponse<UserResponse>> uploadProfileImage(
            @RequestParam("image") MultipartFile file,
            @RequestHeader("Authorization") String token) throws IOException {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path uploadDir = Paths.get("uploads");
        Files.createDirectories(uploadDir);
        Files.copy(file.getInputStream(), uploadDir.resolve(fileName));
        String imageUrl = "/uploads/" + fileName;
        return ResponseEntity.ok(ApiResponse.success("업로드 완료", userService.updateProfileImage(userId, imageUrl)));
    }
}
