package com.helpboys.api.repository;

import com.helpboys.api.entity.Notice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    boolean existsByLink(String link);

    @Query("SELECT DISTINCT n FROM Notice n LEFT JOIN FETCH n.translations ORDER BY n.pubDate DESC NULLS LAST, n.createdAt DESC")
    List<Notice> findAllByOrderByPubDateDescCreatedAtDesc();

    @Query("SELECT DISTINCT n FROM Notice n LEFT JOIN FETCH n.translations WHERE n.categoryId = :categoryId ORDER BY n.pubDate DESC NULLS LAST, n.createdAt DESC")
    List<Notice> findByCategoryIdOrderByPubDateDescCreatedAtDesc(@Param("categoryId") String categoryId);

    @Query(value = "SELECT n FROM Notice n ORDER BY n.createdAt DESC",
           countQuery = "SELECT COUNT(n) FROM Notice n")
    Page<Notice> findAllPaged(Pageable pageable);

    @Query(value = "SELECT n FROM Notice n WHERE n.categoryId = :categoryId ORDER BY n.createdAt DESC",
           countQuery = "SELECT COUNT(n) FROM Notice n WHERE n.categoryId = :categoryId")
    Page<Notice> findByCategoryIdPaged(@Param("categoryId") String categoryId, Pageable pageable);

    List<Notice> findByPubDateBefore(LocalDate date);
}
