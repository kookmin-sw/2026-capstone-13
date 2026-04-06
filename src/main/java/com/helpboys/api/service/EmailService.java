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

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final EmailVerificationRepository verificationRepository;
    private final RestTemplate restTemplate;

    @Value("${resend.api-key}")
    private String resendApiKey;

    @Transactional
    public void sendVerificationCode(String email) {
        if (!email.contains(".ac.kr")) {
            throw new IllegalArgumentException("학교 이메일(.ac.kr)만 허용됩니다.");
        }

        verificationRepository.deleteByEmail(email);

        String code = String.format("%06d", new Random().nextInt(1000000));

        verificationRepository.save(EmailVerification.builder()
                .email(email)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .build());

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(resendApiKey);

            Map<String, Object> body = Map.of(
                    "from", "도와줘코리안 <onboarding@resend.dev>",
                    "to", new String[]{email},
                    "subject", "[도와줘코리안] 이메일 인증번호",
                    "text", "인증번호: " + code + "\n\n5분 내에 입력해주세요.\n\n도와줘코리안 팀 드림"
            );

            restTemplate.exchange(
                    "https://api.resend.com/emails",
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
}
