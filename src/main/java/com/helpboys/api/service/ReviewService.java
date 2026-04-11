package com.helpboys.api.service;

import com.helpboys.api.dto.ReviewRequest;
import com.helpboys.api.dto.ReviewResponse;
import com.helpboys.api.entity.HelpRequest;
import com.helpboys.api.entity.Notification;
import com.helpboys.api.entity.Review;
import com.helpboys.api.entity.User;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.HelpRequestRepository;
import com.helpboys.api.repository.ReviewRepository;
import com.helpboys.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    private final NotificationService notificationService;

    // 리뷰 작성 (요청자 ↔ 도우미 양방향)
    @Transactional
    public ReviewResponse createReview(Long helpRequestId, ReviewRequest request, Long reviewerId) {
        HelpRequest helpRequest = helpRequestRepository.findById(helpRequestId)
                .orElseThrow(() -> new BusinessException("요청을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        // 완료된 요청만 리뷰 가능
        if (helpRequest.getStatus() != HelpRequest.RequestStatus.COMPLETED) {
            throw new BusinessException("완료된 도움 요청만 리뷰할 수 있습니다.");
        }

        if (helpRequest.getHelper() == null) {
            throw new BusinessException("매칭된 도우미가 없습니다.");
        }

        Long requesterId = helpRequest.getRequester().getId();
        Long helperId = helpRequest.getHelper().getId();

        // 요청자 또는 도우미만 리뷰 가능
        if (!reviewerId.equals(requesterId) && !reviewerId.equals(helperId)) {
            throw new BusinessException("해당 도움 요청의 참여자만 리뷰를 작성할 수 있습니다.", HttpStatus.FORBIDDEN);
        }

        // 중복 리뷰 방지
        if (reviewRepository.findByHelpRequestIdAndReviewerId(helpRequestId, reviewerId).isPresent()) {
            throw new BusinessException("이미 리뷰를 작성했습니다.");
        }

        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        // 리뷰 대상: 내가 요청자면 도우미에게, 내가 도우미면 요청자에게
        User reviewee = reviewerId.equals(requesterId)
                ? helpRequest.getHelper()
                : helpRequest.getRequester();

        Review review = Review.builder()
                .helpRequest(helpRequest)
                .reviewer(reviewer)
                .reviewee(reviewee)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        reviewRepository.save(review);

        if (request.getRating() != null) {
            updateRevieweeRating(reviewee);
        }

        // reviewee에게 리뷰 수신 알림
        String message = reviewer.getNickname() + "님이 '" + truncate(helpRequest.getTitle(), 15) + "'에 대한 리뷰를 남겨주셨어요.";
        notificationService.createNotification(
                reviewee.getId(),
                Notification.NotificationType.REVIEW_RECEIVED,
                message,
                helpRequest.getId(),
                Notification.ReferenceType.HELP_REQUEST
        );

        return ReviewResponse.from(review);
    }

    // 리뷰 작성 여부 확인
    @Transactional(readOnly = true)
    public boolean hasReviewed(Long helpRequestId, Long reviewerId) {
        return reviewRepository.existsByHelpRequestIdAndReviewerId(helpRequestId, reviewerId);
    }

    // 특정 유저가 받은 리뷰 목록 조회 (페이지네이션)
    @Transactional(readOnly = true)
    public Page<ReviewResponse> getReviewsByUser(Long userId, int page, int size) {
        return reviewRepository.findByRevieweeIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .map(ReviewResponse::from);
    }

    // reviewee의 평균 평점 갱신
    private void updateRevieweeRating(User reviewee) {
        userRepository.updateRatingFromReviews(reviewee.getId());
    }

    private String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}