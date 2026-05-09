package com.helpboys.api.repository;

import com.helpboys.api.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    Optional<PostLike> findByPostIdAndUserId(Long postId, Long userId);

    // 여러 게시글의 좋아요 여부를 한 번에 조회 (N+1 방지)
    @Query("SELECT pl.post.id FROM PostLike pl WHERE pl.post.id IN :postIds AND pl.user.id = :userId")
    Set<Long> findLikedPostIds(@Param("postIds") List<Long> postIds, @Param("userId") Long userId);

    @Query("SELECT pl FROM PostLike pl JOIN FETCH pl.user WHERE pl.post.id = :postId ORDER BY pl.id DESC")
    List<PostLike> findByPostIdWithUser(@Param("postId") Long postId);
}
