package com.helpboys.api.repository;

import com.helpboys.api.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    boolean existsByRecipientIdAndIsReadFalse(Long recipientId);
}
