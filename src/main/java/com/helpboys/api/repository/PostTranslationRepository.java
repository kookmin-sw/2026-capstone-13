package com.helpboys.api.repository;

import com.helpboys.api.entity.PostTranslation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PostTranslationRepository extends JpaRepository<PostTranslation, Long> {
    Optional<PostTranslation> findByPostIdAndLangCode(Long postId, String langCode);
}
