package com.helpboys.api.repository;

import com.helpboys.api.entity.CommunityPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long> {

    @Query("SELECT p FROM CommunityPost p ORDER BY p.createdAt DESC")
    List<CommunityPost> findAllByOrderByCreatedAtDesc();

    @Query("SELECT p FROM CommunityPost p WHERE p.category = :category ORDER BY p.createdAt DESC")
    List<CommunityPost> findByCategoryOrderByCreatedAtDesc(CommunityPost.PostCategory category);

    @Query("SELECT p FROM CommunityPost p WHERE p.title LIKE %:keyword% OR p.content LIKE %:keyword% ORDER BY p.createdAt DESC")
    List<CommunityPost> searchByKeyword(@Param("keyword") String keyword);

    @Query("SELECT p FROM CommunityPost p WHERE p.author.id NOT IN :blockedIds ORDER BY p.createdAt DESC")
    Page<CommunityPost> findAllExcludingBlocked(@Param("blockedIds") List<Long> blockedIds, Pageable pageable);

    @Query("SELECT p FROM CommunityPost p WHERE (p.title LIKE %:keyword% OR p.content LIKE %:keyword%) AND p.author.id NOT IN :blockedIds ORDER BY p.createdAt DESC")
    Page<CommunityPost> searchByKeywordExcludingBlocked(@Param("keyword") String keyword, @Param("blockedIds") List<Long> blockedIds, Pageable pageable);

    Page<CommunityPost> findByAuthorIdOrderByCreatedAtDesc(Long authorId, Pageable pageable);

    @Modifying
    @Query("UPDATE CommunityPost p SET p.likes = p.likes + 1 WHERE p.id = :id")
    void incrementLikes(@Param("id") Long id);

    @Modifying
    @Query("UPDATE CommunityPost p SET p.likes = p.likes - 1 WHERE p.id = :id")
    void decrementLikes(@Param("id") Long id);
}
