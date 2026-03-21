package com.helpboys.api.repository;

import com.helpboys.api.entity.HelpRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface HelpRequestRepository extends JpaRepository<HelpRequest, Long> {
    List<HelpRequest> findAllByOrderByCreatedAtDesc();

    @Query("SELECT h FROM HelpRequest h WHERE h.requester.id = :requesterId ORDER BY h.createdAt DESC")
    List<HelpRequest> findByRequesterId(@Param("requesterId") Long requesterId);

    List<HelpRequest> findByHelperId(Long helperId);
    List<HelpRequest> findByStatus(HelpRequest.RequestStatus status);

    // 내가 참여한 채팅방 목록 (요청자 or 도우미이고 매칭 이후 상태인 것)
    @Query("SELECT h FROM HelpRequest h WHERE (h.requester.id = :userId OR h.helper.id = :userId) AND h.status IN :statuses ORDER BY h.updatedAt DESC")
    List<HelpRequest> findChatRooms(@Param("userId") Long userId, @Param("statuses") List<HelpRequest.RequestStatus> statuses);

    @Query("SELECT h FROM HelpRequest h WHERE h.title LIKE %:keyword% OR h.description LIKE %:keyword% ORDER BY h.createdAt DESC")
    List<HelpRequest> searchByKeyword(@Param("keyword") String keyword);
}
