package com.helpboys.api.repository;

import com.helpboys.api.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    // 특정 도움 요청에 대한 리뷰 조회 (중복 방지용)
    Optional<Review> findByHelpRequestIdAndReviewerId(Long helpRequestId, Long reviewerId);

    // 리뷰 작성 여부 확인
    boolean existsByHelpRequestIdAndReviewerId(Long helpRequestId, Long reviewerId);

    // 특정 유저가 받은 리뷰 목록 (최신순)
    List<Review> findByRevieweeIdOrderByCreatedAtDesc(Long revieweeId);

    Page<Review> findByRevieweeIdOrderByCreatedAtDesc(Long revieweeId, Pageable pageable);

    // 특정 유저가 받은 평점 평균 계산
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.reviewee.id = :revieweeId")
    Optional<Double> findAverageRatingByRevieweeId(@Param("revieweeId") Long revieweeId);
}