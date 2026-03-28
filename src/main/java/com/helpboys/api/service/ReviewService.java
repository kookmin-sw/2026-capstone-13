package com.helpboys.api.service;

import com.helpboys.api.dto.ReviewRequest;
import com.helpboys.api.dto.ReviewResponse;
import com.helpboys.api.entity.HelpRequest;
import com.helpboys.api.entity.Review;
import com.helpboys.api.entity.User;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.HelpRequestRepository;
import com.helpboys.api.repository.ReviewRepository;
import com.helpboys.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final HelpRequestRepository helpRequestRepository;
    private final UserRepository userRepository;

    // 리뷰 작성 (요청자가 도움 완료 후 helper에게)
    @Transactional
    public ReviewResponse createReview(Long helpRequestId, ReviewRequest request, Long reviewerId) {
        HelpRequest helpRequest = helpRequestRepository.findById(helpRequestId)
                .orElseThrow(() -> new BusinessException("요청을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        // 완료된 요청만 리뷰 가능
        if (helpRequest.getStatus() != HelpRequest.RequestStatus.COMPLETED) {
            throw new BusinessException("완료된 도움 요청만 리뷰할 수 있습니다.");
        }

        // 요청자만 리뷰 가능
        if (!helpRequest.getRequester().getId().equals(reviewerId)) {
            throw new BusinessException("도움을 요청한 본인만 리뷰를 작성할 수 있습니다.", HttpStatus.FORBIDDEN);
        }

        // helper가 있는지 확인
        if (helpRequest.getHelper() == null) {
            throw new BusinessException("매칭된 도우미가 없습니다.");
        }

        // 중복 리뷰 방지
        if (reviewRepository.findByHelpRequestIdAndReviewerId(helpRequestId, reviewerId).isPresent()) {
            throw new BusinessException("이미 리뷰를 작성했습니다.");
        }

        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        User reviewee = helpRequest.getHelper();

        Review review = Review.builder()
                .helpRequest(helpRequest)
                .reviewer(reviewer)
                .reviewee(reviewee)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        reviewRepository.save(review);

        // 별점이 있을 때만 평균 평점 업데이트
        if (request.getRating() != null) {
            updateRevieweeRating(reviewee);
        }

        return ReviewResponse.from(review);
    }

    // 특정 유저가 받은 리뷰 목록 조회
    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByUser(Long userId) {
        return reviewRepository.findByRevieweeIdOrderByCreatedAtDesc(userId).stream()
                .map(ReviewResponse::from)
                .collect(Collectors.toList());
    }

    // reviewee의 평균 평점 갱신
    private void updateRevieweeRating(User reviewee) {
        Double avg = reviewRepository.findAverageRatingByRevieweeId(reviewee.getId())
                .orElse(0.0);
        // 소수점 첫째 자리까지 반올림
        reviewee.setRating(Math.round(avg * 10.0) / 10.0);
        userRepository.save(reviewee);
    }
}