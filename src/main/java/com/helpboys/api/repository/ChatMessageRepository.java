package com.helpboys.api.repository;

import com.helpboys.api.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByRoomIdOrderByCreatedAtAsc(Long roomId);
    Optional<ChatMessage> findTopByRoomIdOrderByCreatedAtDesc(Long roomId);
}
