package com.helpboys.api.repository;

import com.helpboys.api.entity.DirectChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DirectChatMessageRepository extends JpaRepository<DirectChatMessage, Long> {

    List<DirectChatMessage> findByRoom_IdOrderByCreatedAtAsc(Long roomId);

    Optional<DirectChatMessage> findTopByRoom_IdOrderByCreatedAtDesc(Long roomId);

    @Query("SELECT COUNT(m) FROM DirectChatMessage m WHERE m.room.id = :roomId AND m.sender.id <> :myUserId AND m.isRead = false")
    long countUnreadMessages(@Param("roomId") Long roomId, @Param("myUserId") Long myUserId);

    // 차단 유저 제외 마지막 메시지 (채팅 목록 미리보기용)
    @Query("SELECT m FROM DirectChatMessage m WHERE m.room.id = :roomId AND m.sender.id NOT IN :excludeIds ORDER BY m.createdAt DESC")
    List<DirectChatMessage> findByRoomExcludingOrderByCreatedAtDesc(
            @Param("roomId") Long roomId,
            @Param("excludeIds") List<Long> excludeIds,
            Pageable pageable);

    // 차단 유저 제외 안읽음 카운트
    @Query("SELECT COUNT(m) FROM DirectChatMessage m WHERE m.room.id = :roomId AND m.sender.id <> :myUserId AND m.sender.id NOT IN :excludeIds AND m.isRead = false")
    long countUnreadMessagesExcluding(
            @Param("roomId") Long roomId,
            @Param("myUserId") Long myUserId,
            @Param("excludeIds") List<Long> excludeIds);

    @Modifying
    @Query("UPDATE DirectChatMessage m SET m.isRead = true WHERE m.room.id = :roomId AND m.sender.id <> :myUserId AND m.isRead = false")
    int markAsRead(@Param("roomId") Long roomId, @Param("myUserId") Long myUserId);
}
