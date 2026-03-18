package com.helpboys.api.repository;

import com.helpboys.api.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    boolean existsByLink(String link);
    List<Notice> findAllByOrderByPubDateDescCreatedAtDesc();
    List<Notice> findByCategoryIdOrderByPubDateDescCreatedAtDesc(String categoryId);
}
