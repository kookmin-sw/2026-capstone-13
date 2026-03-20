package com.helpboys.api.repository;

import com.helpboys.api.entity.CommunityPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long> {

    @Query("SELECT p FROM CommunityPost p ORDER BY p.createdAt DESC")
    List<CommunityPost> findAllByOrderByCreatedAtDesc();

    @Query("SELECT p FROM CommunityPost p WHERE p.category = :category ORDER BY p.createdAt DESC")
    List<CommunityPost> findByCategoryOrderByCreatedAtDesc(CommunityPost.PostCategory category);
}
