package com.helpboys.api.service;

import com.helpboys.api.entity.EmailVerification;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.EmailVerificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailVerificationRepository emailVerificationRepository;

    @Value("${spring.mail.username}")
    private String fromEmail;

    // 인증 코드 발송 (기존 코드가 있으면 덮어씀)
    @Transactional
    public void sendVerificationCode(String email) {
        String code = generateCode();

        // 기존 인증 요청 삭제 후 새로 저장
        emailVerificationRepository.deleteByEmail(email);

        EmailVerification verification = EmailVerification.builder()
                .email(email)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();
        emailVerificationRepository.save(verification);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(email);
        message.setSubject("[도와줘코리안] 이메일 인증 코드");
        message.setText(
                "안녕하세요, 도와줘코리안입니다.\n\n" +
                "이메일 인증 코드: " + code + "\n\n" +
                "10분 내에 입력해주세요.\n" +
                "본인이 요청하지 않았다면 이 메일을 무시하세요."
        );
        mailSender.send(message);
    }

    // 인증 코드 확인
    @Transactional
    public void verifyCode(String email, String code) {
        EmailVerification verification = emailVerificationRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("인증 코드를 먼저 요청해주세요."));

        if (LocalDateTime.now().isAfter(verification.getExpiresAt())) {
            throw new BusinessException("인증 코드가 만료되었습니다. 다시 요청해주세요.");
        }

        if (!verification.getCode().equals(code)) {
            throw new BusinessException("인증 코드가 일치하지 않습니다.");
        }

        verification.setVerified(true);
        emailVerificationRepository.save(verification);
    }

    // 해당 이메일이 인증 완료됐는지 확인
    public boolean isVerified(String email) {
        return emailVerificationRepository.findByEmail(email)
                .map(EmailVerification::isVerified)
                .orElse(false);
    }

    // 인증 정보 삭제 (회원가입 완료 후 정리)
    @Transactional
    public void deleteVerification(String email) {
        emailVerificationRepository.deleteByEmail(email);
    }

    private String generateCode() {
        return String.format("%06d", new Random().nextInt(1_000_000));
    }
}