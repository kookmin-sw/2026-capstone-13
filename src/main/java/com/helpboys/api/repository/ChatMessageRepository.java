package com.helpboys.api.repository;

import com.helpboys.api.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByRoomIdOrderByCreatedAtAsc(Long roomId);
    Optional<ChatMessage> findTopByRoomIdOrderByCreatedAtDesc(Long roomId);

    // 내가 받은 메시지(상대방이 보낸) 중 안 읽은 개수
    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.roomId = :roomId AND m.sender.id != :myUserId AND m.isRead = false")
    long countUnreadMessages(@Param("roomId") Long roomId, @Param("myUserId") Long myUserId);

    // 내가 받은 메시지(상대방이 보낸) 중 안 읽은 것 일괄 읽음 처리
    @Modifying
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.roomId = :roomId AND m.sender.id != :myUserId AND m.isRead = false")
    int markAsRead(@Param("roomId") Long roomId, @Param("myUserId") Long myUserId);
}
