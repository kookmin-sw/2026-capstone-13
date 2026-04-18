package com.helpboys.api.repository;

import com.helpboys.api.entity.DirectChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DirectChatRoomRepository extends JpaRepository<DirectChatRoom, Long> {

    @Query("SELECT r FROM DirectChatRoom r WHERE " +
           "(r.user1.id = :u1 AND r.user2.id = :u2) OR (r.user1.id = :u2 AND r.user2.id = :u1)")
    Optional<DirectChatRoom> findByUsers(@Param("u1") Long u1, @Param("u2") Long u2);

    @Query("SELECT r FROM DirectChatRoom r WHERE r.user1.id = :userId OR r.user2.id = :userId")
    List<DirectChatRoom> findByUserId(@Param("userId") Long userId);
}
