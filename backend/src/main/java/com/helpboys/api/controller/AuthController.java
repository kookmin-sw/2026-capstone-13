package com.helpboys.api.controller;

import com.helpboys.api.dto.*;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.service.EmailService;
import com.helpboys.api.service.UserService;
import com.helpboys.api.util.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
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
    private final RateLimiter rateLimiter;

    // POST /api/auth/register - 회원가입
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse user = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("회원가입이 완료되었습니다. 학생증 검토 후 로그인 가능합니다.", user));
    }

    // POST /api/auth/login - 로그인 (분당 10회 제한)
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        String key = "login:" + request.getEmail();
        if (!rateLimiter.isAllowed(key, 10, 60)) {
            throw new BusinessException("로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.", HttpStatus.TOO_MANY_REQUESTS);
        }
        LoginResponse response = userService.login(request);
        return ResponseEntity.ok(ApiResponse.success("로그인 성공", response));
    }

    // POST /api/auth/send-code - 이메일 인증번호 발송 (분당 3회 제한)
    @PostMapping("/send-code")
    public ResponseEntity<ApiResponse<String>> sendCode(
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest) {
        String email = body.get("email");
        String key = "send-code:" + email;
        if (!rateLimiter.isAllowed(key, 3, 60)) {
            throw new BusinessException("인증번호 요청이 너무 많습니다. 1분 후 다시 시도해주세요.", HttpStatus.TOO_MANY_REQUESTS);
        }
        emailService.sendVerificationCode(email);
        return ResponseEntity.ok(ApiResponse.success("인증번호가 발송되었습니다.", null));
    }

    // POST /api/auth/verify-code - 인증번호 확인 (이메일당 분당 10회 제한)
    @PostMapping("/verify-code")
    public ResponseEntity<ApiResponse<String>> verifyCode(
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest) {
        String email = body.get("email");
        if (!rateLimiter.isAllowed("verify:" + email, 10, 60)) {
            throw new BusinessException("인증번호 확인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.", HttpStatus.TOO_MANY_REQUESTS);
        }
        boolean ok = emailService.verifyCode(email, body.get("code"));
        if (!ok) {
            return ResponseEntity.badRequest().body(ApiResponse.error("인증번호가 올바르지 않거나 만료되었습니다."));
        }
        return ResponseEntity.ok(ApiResponse.success("이메일 인증이 완료되었습니다.", null));
    }

    // POST /api/auth/reset-password - 비밀번호 재설정
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        boolean valid = emailService.verifyCodeForPasswordReset(request.getEmail(), request.getCode());
        if (!valid) {
            return ResponseEntity.badRequest().body(ApiResponse.error("인증코드가 올바르지 않습니다."));
        }
        userService.resetPassword(request.getEmail(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success("비밀번호가 변경되었습니다.", null));
    }

    // POST /api/auth/student-id/upload - 학생증 이미지 업로드 (multipart)
    @PostMapping(value = "/student-id/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<StudentIdUploadResponse>> uploadStudentId(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest) {
        // IP 기반 rate limiting (분당 5회, 하루 20회)
        String ip = getClientIp(httpRequest);
        if (!rateLimiter.isAllowed("student-id:min:" + ip, 5, 60) ||
            !rateLimiter.isAllowed("student-id:day:" + ip, 20, 86400)) {
            throw new BusinessException("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", HttpStatus.TOO_MANY_REQUESTS);
        }
        // 이미지 파일 타입 검증
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BusinessException("이미지 파일만 업로드할 수 있습니다. (jpg, png 등)");
        }
        String imageUrl = userService.uploadStudentIdImage(file);
        return ResponseEntity.ok(ApiResponse.success("학생증이 업로드되었습니다.", new StudentIdUploadResponse(imageUrl)));
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}