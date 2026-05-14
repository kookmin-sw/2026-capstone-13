package com.helpboys.api.repository;

import com.helpboys.api.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {
    Optional<EmailVerification> findTopByEmailOrderByCreatedAtDesc(String email);
    Optional<EmailVerification> findTopByEmailAndUsedFalseOrderByCreatedAtDesc(String email);
    void deleteByEmail(String email);
}