package com.helpboys.api.repository;

import com.helpboys.api.entity.HelpRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface HelpRequestRepository extends JpaRepository<HelpRequest, Long> {
    List<HelpRequest> findAllByOrderByCreatedAtDesc();

    @Query("SELECT h FROM HelpRequest h WHERE h.requester.id = :requesterId ORDER BY h.createdAt DESC")
    List<HelpRequest> findByRequesterId(@Param("requesterId") Long requesterId);

    List<HelpRequest> findByHelperId(Long helperId);
    List<HelpRequest> findByStatus(HelpRequest.RequestStatus status);

    @Query(value = "SELECT h FROM HelpRequest h LEFT JOIN FETCH h.requester LEFT JOIN FETCH h.helper WHERE h.requester.id NOT IN :blockedIds ORDER BY h.createdAt DESC",
           countQuery = "SELECT COUNT(h) FROM HelpRequest h WHERE h.requester.id NOT IN :blockedIds")
    Page<HelpRequest> findAllExcludingBlocked(@Param("blockedIds") List<Long> blockedIds, Pageable pageable);

    @Query(value = "SELECT h FROM HelpRequest h LEFT JOIN FETCH h.requester LEFT JOIN FETCH h.helper WHERE h.status = :status AND h.requester.id NOT IN :blockedIds ORDER BY h.createdAt DESC",
           countQuery = "SELECT COUNT(h) FROM HelpRequest h WHERE h.status = :status AND h.requester.id NOT IN :blockedIds")
    Page<HelpRequest> findByStatusExcludingBlocked(@Param("status") HelpRequest.RequestStatus status, @Param("blockedIds") List<Long> blockedIds, Pageable pageable);

    @Query(value = "SELECT h FROM HelpRequest h LEFT JOIN FETCH h.requester LEFT JOIN FETCH h.helper WHERE h.requester.id = :requesterId ORDER BY h.createdAt DESC",
           countQuery = "SELECT COUNT(h) FROM HelpRequest h WHERE h.requester.id = :requesterId")
    Page<HelpRequest> findByRequesterIdOrderByCreatedAtDesc(@Param("requesterId") Long requesterId, Pageable pageable);

    @Query(value = "SELECT h FROM HelpRequest h LEFT JOIN FETCH h.requester LEFT JOIN FETCH h.helper WHERE h.helper.id = :helperId ORDER BY h.createdAt DESC",
           countQuery = "SELECT COUNT(h) FROM HelpRequest h WHERE h.helper.id = :helperId")
    Page<HelpRequest> findByHelperIdOrderByCreatedAtDesc(@Param("helperId") Long helperId, Pageable pageable);

    @Query(value = "SELECT h FROM HelpRequest h LEFT JOIN FETCH h.requester LEFT JOIN FETCH h.helper WHERE h.helper.id = :helperId AND h.status = :status ORDER BY h.createdAt DESC",
           countQuery = "SELECT COUNT(h) FROM HelpRequest h WHERE h.helper.id = :helperId AND h.status = :status")
    Page<HelpRequest> findByHelperIdAndStatusOrderByCreatedAtDesc(@Param("helperId") Long helperId, @Param("status") HelpRequest.RequestStatus status, Pageable pageable);

    @Query(value = "SELECT h FROM HelpRequest h LEFT JOIN FETCH h.requester LEFT JOIN FETCH h.helper WHERE h.requester.id = :requesterId AND h.status = :status ORDER BY h.createdAt DESC",
           countQuery = "SELECT COUNT(h) FROM HelpRequest h WHERE h.requester.id = :requesterId AND h.status = :status")
    Page<HelpRequest> findByRequesterIdAndStatusOrderByCreatedAtDesc(@Param("requesterId") Long requesterId, @Param("status") HelpRequest.RequestStatus status, Pageable pageable);

    // 내가 참여한 채팅방 목록 (요청자 or 도우미이고 매칭 이후 상태인 것)
    @Query("SELECT h FROM HelpRequest h LEFT JOIN FETCH h.requester LEFT JOIN FETCH h.helper WHERE (h.requester.id = :userId OR h.helper.id = :userId) AND h.status IN :statuses ORDER BY h.updatedAt DESC")
    List<HelpRequest> findChatRooms(@Param("userId") Long userId, @Param("statuses") List<HelpRequest.RequestStatus> statuses);

    @Query("SELECT h FROM HelpRequest h LEFT JOIN FETCH h.requester LEFT JOIN FETCH h.helper WHERE h.title LIKE %:keyword% OR h.description LIKE %:keyword% ORDER BY h.createdAt DESC")
    List<HelpRequest> searchByKeyword(@Param("keyword") String keyword);

    @Query("SELECT h FROM HelpRequest h LEFT JOIN FETCH h.requester LEFT JOIN FETCH h.helper WHERE h.id = :id")
    Optional<HelpRequest> findByIdWithUsers(@Param("id") Long id);

    @Query("SELECT h.helper, COUNT(h) as cnt FROM HelpRequest h " +
           "WHERE h.category = :category AND h.status = :status " +
           "AND h.helper IS NOT NULL AND h.helper.id NOT IN :excludeIds AND h.helper.isDeleted = false " +
           "GROUP BY h.helper ORDER BY cnt DESC, h.helper.rating DESC")
    List<Object[]> findTopHelpersByCategory(
            @Param("category") HelpRequest.HelpCategory category,
            @Param("status") HelpRequest.RequestStatus status,
            @Param("excludeIds") List<Long> excludeIds,
            Pageable pageable);
}
