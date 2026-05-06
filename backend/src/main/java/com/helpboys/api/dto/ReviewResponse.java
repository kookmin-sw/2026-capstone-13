package com.helpboys.api.dto;

import com.helpboys.api.entity.Review;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class ReviewResponse {

    private Long id;
    private Long helpRequestId;
    private String helpRequestTitle;
    private UserResponse reviewer;
    private UserResponse reviewee;
    private Integer rating;   // null이면 별점 미입력, 1~5 정수
    private String comment;
    private String createdAt;

    public static ReviewResponse from(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .helpRequestId(review.getHelpRequest().getId())
                .helpRequestTitle(review.getHelpRequest().getTitle())
                .reviewer(UserResponse.from(review.getReviewer()))
                .reviewee(UserResponse.from(review.getReviewee()))
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt().toString())
                .build();
    }
}