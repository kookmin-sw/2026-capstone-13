package com.helpboys.api.repository;

import com.helpboys.api.entity.CommentTranslation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CommentTranslationRepository extends JpaRepository<CommentTranslation, Long> {
    Optional<CommentTranslation> findByCommentIdAndLangCode(Long commentId, String langCode);
}
