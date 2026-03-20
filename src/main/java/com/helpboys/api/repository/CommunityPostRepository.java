package com.helpboys.api.repository;

import com.helpboys.api.entity.CommunityPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long> {

    @Query("SELECT p FROM CommunityPost p JOIN FETCH p.author ORDER BY p.createdAt DESC")
    List<CommunityPost> findAllByOrderByCreatedAtDesc();

    @Query("SELECT DISTINCT p FROM CommunityPost p JOIN FETCH p.author LEFT JOIN FETCH p.commentList cl LEFT JOIN FETCH cl.author WHERE p.id = :id")
    Optional<CommunityPost> findByIdWithDetails(@Param("id") Long id);
}
