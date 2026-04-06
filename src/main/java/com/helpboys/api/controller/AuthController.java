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

import java.util.Map;

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

    // POST /api/auth/send-code - 이메일 인증번호 발송
    @PostMapping("/send-code")
    public ResponseEntity<ApiResponse<String>> sendCode(@RequestBody Map<String, String> body) {
        emailService.sendVerificationCode(body.get("email"));
        return ResponseEntity.ok(ApiResponse.success("인증번호가 발송되었습니다.", null));
    }

    // POST /api/auth/verify-code - 인증번호 확인
    @PostMapping("/verify-code")
    public ResponseEntity<ApiResponse<String>> verifyCode(@RequestBody Map<String, String> body) {
        boolean ok = emailService.verifyCode(body.get("email"), body.get("code"));
        if (!ok) {
            return ResponseEntity.badRequest().body(ApiResponse.error("인증번호가 올바르지 않거나 만료되었습니다."));
        }
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