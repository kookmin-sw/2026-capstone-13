package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.ReviewResponse;
import com.helpboys.api.dto.UserResponse;
import com.helpboys.api.service.ReviewService;
import com.helpboys.api.service.UserService;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final ReviewService reviewService;
    private final JwtUtil jwtUtil;

    // GET /api/users/list/koreans - 한국인 유저 목록 조회 (외국인/교환학생이 도움 요청할 한국인 탐색)
    @GetMapping("/list/koreans")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getKoreanUsers() {
        return ResponseEntity.ok(ApiResponse.success("조회 성공", userService.getKoreanUsers()));
    }

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

    // GET /api/users/{id}/reviews - 특정 유저가 받은 리뷰 목록 조회
    @GetMapping("/{id}/reviews")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getUserReviews(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success("조회 성공", reviewService.getReviewsByUser(id, page, size)));
    }

    // PATCH /api/users/fcm-token - FCM 토큰 등록/갱신
    @PatchMapping("/fcm-token")
    public ResponseEntity<ApiResponse<Void>> updateFcmToken(
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        userService.updateFcmToken(userId, body.get("fcmToken"));
        return ResponseEntity.ok(ApiResponse.success("FCM 토큰 저장 완료", null));
    }

    // POST /api/users/profile-image - 프로필 이미지 업로드 (Cloudinary)
    @PostMapping("/profile-image")
    public ResponseEntity<ApiResponse<UserResponse>> uploadProfileImage(
            @RequestParam("image") MultipartFile file,
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        String imageUrl = userService.uploadImage(file, "profile-images");
        return ResponseEntity.ok(ApiResponse.success("업로드 완료", userService.updateProfileImage(userId, imageUrl)));
    }

    // POST /api/users/student-id - 학생증 이미지 URL 저장 (Cloudinary URL)
    @PostMapping("/student-id")
    public ResponseEntity<ApiResponse<String>> uploadStudentId(
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        userService.uploadStudentId(userId, body.get("imageUrl"));
        return ResponseEntity.ok(ApiResponse.success("학생증이 제출되었습니다. 심사 후 인증됩니다.", null));
    }

    // PATCH /api/users/{id}/student-id/approve - 학생증 승인 (어드민용)
    @PatchMapping("/{id}/student-id/approve")
    public ResponseEntity<ApiResponse<String>> approveStudentId(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        checkAdmin(token);
        userService.approveStudentId(id);
        return ResponseEntity.ok(ApiResponse.success("학생증 인증이 승인되었습니다.", null));
    }

    // PATCH /api/users/{id}/student-id/reject - 학생증 거절 (어드민용)
    @PatchMapping("/{id}/student-id/reject")
    public ResponseEntity<ApiResponse<String>> rejectStudentId(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        checkAdmin(token);
        userService.rejectStudentId(id);
        return ResponseEntity.ok(ApiResponse.success("학생증 인증이 거절되었습니다.", null));
    }

    private void checkAdmin(String bearerToken) {
        Long userId = jwtUtil.extractUserId(bearerToken.replace("Bearer ", ""));
        userService.checkAdmin(userId);
    }
}
