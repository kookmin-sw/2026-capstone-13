package com.helpboys.api.service;

import com.helpboys.api.entity.EmailVerification;
import com.helpboys.api.repository.EmailVerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailVerificationRepository verificationRepository;

    /**
     * 인증번호 발송 (ac.kr 도메인만 허용)
     */
    public void sendVerificationCode(String email) {
        if (!email.contains(".ac.kr")) {
            throw new IllegalArgumentException("학교 이메일(.ac.kr)만 허용됩니다.");
        }

        String code = String.format("%06d", new Random().nextInt(1000000));

        verificationRepository.save(EmailVerification.builder()
                .email(email)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .build());

        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(email);
            msg.setSubject("[도와줘코리안] 이메일 인증번호");
            msg.setText("인증번호: " + code + "\n\n5분 내에 입력해주세요.\n\n도와줘코리안 팀 드림");
            mailSender.send(msg);
            log.info("[이메일 인증] 발송 완료: {}", email);
        } catch (Exception e) {
            log.error("[이메일 인증] 발송 실패: {}", e.getMessage());
            throw new RuntimeException("이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    /**
     * 인증번호 확인
     */
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
}
