package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.UserResponse;
import com.helpboys.api.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;

    // GET /api/admin/student-ids - 학생증 검토 대기 목록
    @GetMapping("/student-ids")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getPendingStudentIds(
            @AuthenticationPrincipal UserDetails userDetails) {
        checkAdmin(userDetails);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", userService.getPendingStudentIds()));
    }

    // POST /api/admin/student-ids/{userId}/approve - 학생증 승인
    @PostMapping("/student-ids/{userId}/approve")
    public ResponseEntity<ApiResponse<Void>> approveStudentId(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        checkAdmin(userDetails);
        userService.approveStudentId(userId);
        return ResponseEntity.ok(ApiResponse.success("학생증이 승인되었습니다.", null));
    }

    // POST /api/admin/student-ids/{userId}/reject - 학생증 거절
    @PostMapping("/student-ids/{userId}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectStudentId(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        checkAdmin(userDetails);
        userService.rejectStudentId(userId);

        return ResponseEntity.ok(ApiResponse.success("학생증이 거절되었습니다.", null));
    }

    private void checkAdmin(UserDetails userDetails) {
        userService.checkAdminByEmail(userDetails.getUsername());
    }
}