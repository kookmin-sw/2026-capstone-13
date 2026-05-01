package com.helpboys.api.repository;

import com.helpboys.api.entity.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

    List<PostComment> findByPostIdAndParentCommentIsNullOrderByCreatedAtAsc(Long postId);

    List<PostComment> findByParentCommentIdOrderByCreatedAtAsc(Long parentCommentId);

    int countByParentCommentId(Long parentCommentId);
}
