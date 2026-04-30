package com.helpboys.api.service;

import com.helpboys.api.entity.EmailVerification;
import com.helpboys.api.repository.EmailVerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final EmailVerificationRepository verificationRepository;
    private final RestTemplate restTemplate;

    @Value("${sendgrid.api-key}")
    private String sendgridApiKey;

    @Value("${sendgrid.from-email}")
    private String fromEmail;

    @Transactional
    public void sendVerificationCode(String email) {
        if (!email.endsWith("@kookmin.ac.kr") && !email.endsWith(".kookmin.ac.kr")) {
            throw new IllegalArgumentException("국민대학교 이메일(@kookmin.ac.kr)만 허용됩니다.");
        }

        verificationRepository.deleteByEmail(email);

        String code = String.format("%06d", new SecureRandom().nextInt(1000000));

        verificationRepository.save(EmailVerification.builder()
                .email(email)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .build());

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(sendgridApiKey);

            Map<String, Object> body = Map.of(
                    "personalizations", List.of(Map.of("to", List.of(Map.of("email", email)))),
                    "from", Map.of("email", fromEmail, "name", "도와줘코리안"),
                    "subject", "[도와줘코리안] 이메일 인증번호",
                    "content", List.of(Map.of(
                            "type", "text/plain",
                            "value", "인증번호: " + code + "\n\n5분 내에 입력해주세요.\n\n도와줘코리안 팀 드림"
                    ))
            );

            restTemplate.exchange(
                    "https://api.sendgrid.com/v3/mail/send",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class
            );
            log.info("[이메일 인증] 발송 완료: {}", email);
        } catch (Exception e) {
            log.error("[이메일 인증] 발송 실패: {}", e.getMessage());
            throw new RuntimeException("이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    @Transactional
    public boolean verifyCode(String email, String code) {
        Optional<EmailVerification> opt =
                verificationRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc(email);

        if (opt.isEmpty()) return false;

        EmailVerification v = opt.get();
        if (v.isUsed() || LocalDateTime.now().isAfter(v.getExpiresAt())) return false;
        if (!v.getCode().equals(code)) return false;

        v.setUsed(true);
        verificationRepository.save(v);
        return true;
    }

    public boolean isVerified(String email) {
        return verificationRepository.findTopByEmailOrderByCreatedAtDesc(email)
                .map(EmailVerification::isUsed)
                .orElse(false);
    }

    @Transactional
    public void deleteVerification(String email) {
        verificationRepository.deleteByEmail(email);
    }

    // 비밀번호 재설정용: verify-code로 이미 인증된 코드 확인 후 무효화
    @Transactional
    public boolean verifyCodeForPasswordReset(String email, String code) {
        Optional<EmailVerification> opt =
                verificationRepository.findTopByEmailOrderByCreatedAtDesc(email);

        if (opt.isEmpty()) return false;

        EmailVerification v = opt.get();
        if (!v.getCode().equals(code)) return false;
        if (v.getCreatedAt().plusMinutes(10).isBefore(LocalDateTime.now())) return false;

        verificationRepository.delete(v);
        return true;
    }
}