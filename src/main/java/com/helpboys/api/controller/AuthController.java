package com.helpboys.api.controller;

import com.helpboys.api.dto.*;
import com.helpboys.api.service.EmailService;
import com.helpboys.api.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final EmailService emailService;

    // POST /api/auth/register - 회원가입
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse user = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("회원가입이 완료되었습니다. 학생증 검토 후 로그인 가능합니다.", user));
    }

    // POST /api/auth/login - 로그인
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = userService.login(request);
        return ResponseEntity.ok(ApiResponse.success("로그인 성공", response));
    }

    // POST /api/auth/email/send-code - 이메일 인증 코드 발송
    @PostMapping("/email/send-code")
    public ResponseEntity<ApiResponse<Void>> sendEmailCode(@Valid @RequestBody EmailSendRequest request) {
        emailService.sendVerificationCode(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("인증 코드가 발송되었습니다. 10분 내에 입력해주세요.", null));
    }

    // POST /api/auth/email/verify - 이메일 인증 코드 확인
    @PostMapping("/email/verify")
    public ResponseEntity<ApiResponse<Void>> verifyEmailCode(@Valid @RequestBody EmailVerifyRequest request) {
        emailService.verifyCode(request.getEmail(), request.getCode());
        return ResponseEntity.ok(ApiResponse.success("이메일 인증이 완료되었습니다.", null));
    }

    // POST /api/auth/student-id/upload - 학생증 이미지 업로드 (multipart)
    @PostMapping(value = "/student-id/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<StudentIdUploadResponse>> uploadStudentId(
            @RequestParam("file") MultipartFile file) {
        String imageUrl = userService.uploadStudentIdImage(file);
        return ResponseEntity.ok(ApiResponse.success("학생증이 업로드되었습니다.", new StudentIdUploadResponse(imageUrl)));
    }
}
