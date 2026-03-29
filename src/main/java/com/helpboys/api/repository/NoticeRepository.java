package com.helpboys.api.repository;

import com.helpboys.api.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    boolean existsByLink(String link);

    @Query("SELECT DISTINCT n FROM Notice n LEFT JOIN FETCH n.translations ORDER BY n.pubDate DESC NULLS LAST, n.createdAt DESC")
    List<Notice> findAllByOrderByPubDateDescCreatedAtDesc();

    @Query("SELECT DISTINCT n FROM Notice n LEFT JOIN FETCH n.translations WHERE n.categoryId = :categoryId ORDER BY n.pubDate DESC NULLS LAST, n.createdAt DESC")
    List<Notice> findByCategoryIdOrderByPubDateDescCreatedAtDesc(@Param("categoryId") String categoryId);
}
