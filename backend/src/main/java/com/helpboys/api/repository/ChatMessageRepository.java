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

    // 여러 채팅방의 마지막 메시지를 한 번에 조회 (N+1 방지)
    @Query("SELECT m FROM ChatMessage m WHERE m.id IN " +
           "(SELECT MAX(m2.id) FROM ChatMessage m2 WHERE m2.roomId IN :roomIds GROUP BY m2.roomId)")
    List<ChatMessage> findLastMessagesByRoomIds(@Param("roomIds") List<Long> roomIds);

    // 여러 채팅방의 읽지 않은 메시지 수를 한 번에 조회 (N+1 방지)
    // 반환: [roomId, count]
    @Query("SELECT m.roomId, COUNT(m) FROM ChatMessage m " +
           "WHERE m.roomId IN :roomIds AND m.sender.id != :myUserId AND m.isRead = false " +
           "GROUP BY m.roomId")
    List<Object[]> countUnreadByRoomIds(@Param("roomIds") List<Long> roomIds, @Param("myUserId") Long myUserId);
}
