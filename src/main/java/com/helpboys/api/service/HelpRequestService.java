package com.helpboys.api.service;

import com.helpboys.api.dto.HelpRequestRequest;
import com.helpboys.api.dto.HelpRequestResponse;
import com.helpboys.api.entity.HelpRequest;
import com.helpboys.api.entity.Notification;
import com.helpboys.api.entity.User;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.HelpRequestRepository;
import com.helpboys.api.repository.ReviewRepository;
import com.helpboys.api.repository.UserBlockRepository;
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
public class HelpRequestService {

    private final HelpRequestRepository helpRequestRepository;
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final NotificationService notificationService;
    private final ReviewRepository reviewRepository;

    // 도움 요청 전체 목록 조회 (최신순, 차단 유저 제외, 페이지네이션)
    @Transactional(readOnly = true)
    public Page<HelpRequestResponse> getAllRequests(Long userId, int page, int size) {
        List<Long> blockedIds = userBlockRepository.findBlockedIdsByBlockerId(userId);
        List<Long> excludeIds = blockedIds.isEmpty() ? List.of(-1L) : blockedIds;
        return helpRequestRepository.findAllExcludingBlocked(excludeIds, PageRequest.of(page, size))
                .map(HelpRequestResponse::from);
    }

    // 대기 중인 도움 요청만 조회 (한국인 학생용, 차단 유저 제외, 페이지네이션)
    @Transactional(readOnly = true)
    public Page<HelpRequestResponse> getWaitingRequests(Long userId, int page, int size) {
        List<Long> blockedIds = userBlockRepository.findBlockedIdsByBlockerId(userId);
        List<Long> excludeIds = blockedIds.isEmpty() ? List.of(-1L) : blockedIds;
        return helpRequestRepository.findByStatusExcludingBlocked(HelpRequest.RequestStatus.WAITING, excludeIds, PageRequest.of(page, size))
                .map(HelpRequestResponse::from);
    }

    // 내가 등록한 도움 요청 목록 (페이지네이션)
    @Transactional(readOnly = true)
    public Page<HelpRequestResponse> getMyRequests(Long requesterId, int page, int size) {
        return helpRequestRepository.findByRequesterIdOrderByCreatedAtDesc(requesterId, PageRequest.of(page, size))
                .map(HelpRequestResponse::from);
    }

    // 내가 도움을 준 요청 목록 (페이지네이션)
    @Transactional(readOnly = true)
    public Page<HelpRequestResponse> getHelpedRequests(Long helperId, int page, int size) {
        return helpRequestRepository.findByHelperIdOrderByCreatedAtDesc(helperId, PageRequest.of(page, size))
                .map(HelpRequestResponse::from);
    }

    // 특정 유저의 도움 내역 조회 - 한국인: 도우미로 완료한 내역
    @Transactional(readOnly = true)
    public Page<HelpRequestResponse> getUserHelpHistory(Long targetUserId, int page, int size) {
        return helpRequestRepository.findByHelperIdAndStatusOrderByCreatedAtDesc(
                targetUserId, HelpRequest.RequestStatus.COMPLETED, PageRequest.of(page, size))
                .map(HelpRequestResponse::from);
    }

    // 특정 유저의 도움 요청 내역 조회 - 외국인: 요청자로 완료된 내역
    @Transactional(readOnly = true)
    public Page<HelpRequestResponse> getUserRequestHistory(Long targetUserId, int page, int size) {
        return helpRequestRepository.findByRequesterIdAndStatusOrderByCreatedAtDesc(
                targetUserId, HelpRequest.RequestStatus.COMPLETED, PageRequest.of(page, size))
                .map(HelpRequestResponse::from);
    }

    // 도움 요청 단건 조회
    @Transactional(readOnly = true)
    public HelpRequestResponse getRequestById(Long id) {
        HelpRequest req = findById(id);
        boolean reviewWritten = reviewRepository.existsByHelpRequestIdAndReviewerId(
                req.getId(), req.getRequester().getId());
        return HelpRequestResponse.from(req, reviewWritten);
    }

    // 도움 요청 생성 (유학생만)
    @Transactional
    public HelpRequestResponse createRequest(HelpRequestRequest request, Long requesterId) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        if (requester.getUserType() == User.UserType.KOREAN) {
            throw new BusinessException("도움 요청은 외국인 학생만 등록할 수 있습니다.");
        }

        HelpRequest helpRequest = HelpRequest.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .helpMethod(request.getHelpMethod())
                .requester(requester)
                .build();

        return HelpRequestResponse.from(helpRequestRepository.save(helpRequest));
    }

    // 도움 요청 수정 (작성자만)
    @Transactional
    public HelpRequestResponse updateRequest(Long requestId, HelpRequestRequest request, Long userId) {
        HelpRequest req = findById(requestId);

        if (!req.getRequester().getId().equals(userId)) {
            throw new BusinessException("본인의 요청만 수정할 수 있습니다.", HttpStatus.FORBIDDEN);
        }
        if (req.getStatus() != HelpRequest.RequestStatus.WAITING) {
            throw new BusinessException("대기 중인 요청만 수정할 수 있습니다.");
        }

        req.setTitle(request.getTitle());
        req.setDescription(request.getDescription());
        req.setCategory(request.getCategory());
        req.setHelpMethod(request.getHelpMethod());
        return HelpRequestResponse.from(helpRequestRepository.save(req));
    }

    // 도움 수락 (한국인 학생이 매칭)
    @Transactional
    public HelpRequestResponse acceptRequest(Long requestId, Long helperId) {
        HelpRequest req = findById(requestId);
        User helper = userRepository.findById(helperId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        if (helper.getUserType() != User.UserType.KOREAN) {
            throw new BusinessException("도움 수락은 한국인 학생만 할 수 있습니다.");
        }
        if (req.getStatus() != HelpRequest.RequestStatus.WAITING) {
            throw new BusinessException("이미 매칭된 요청입니다.");
        }

        req.setHelper(helper);
        req.setStatus(HelpRequest.RequestStatus.MATCHED);
        HelpRequestResponse result = HelpRequestResponse.from(helpRequestRepository.save(req));

        // 요청자(유학생)에게 매칭 알림 발송
        String message = helper.getNickname() + "님이 '" + truncate(req.getTitle(), 15) + "' 도움 요청을 수락했어요.";
        notificationService.createNotification(
                req.getRequester().getId(),
                Notification.NotificationType.HELP_OFFER,
                message,
                req.getId(),
                Notification.ReferenceType.HELP_REQUEST
        );

        return result;
    }

    // 도움 신청 거절 (외국인 학생이 helper를 거절 → WAITING으로 복귀)
    @Transactional
    public HelpRequestResponse rejectHelper(Long requestId, Long requesterId) {
        HelpRequest req = findById(requestId);

        if (!req.getRequester().getId().equals(requesterId)) {
            throw new BusinessException("본인의 요청만 거절할 수 있습니다.", HttpStatus.FORBIDDEN);
        }
        if (req.getStatus() != HelpRequest.RequestStatus.MATCHED) {
            throw new BusinessException("매칭 대기 중인 요청만 거절할 수 있습니다.");
        }

        req.setHelper(null);
        req.setStatus(HelpRequest.RequestStatus.WAITING);
        return HelpRequestResponse.from(helpRequestRepository.save(req));
    }

    // 상태 변경 (진행 중 / 완료 / 취소)
    @Transactional
    public HelpRequestResponse updateStatus(Long requestId, HelpRequest.RequestStatus newStatus, Long userId) {
        HelpRequest req = findById(requestId);

        boolean isRequester = req.getRequester().getId().equals(userId);
        boolean isHelper = req.getHelper() != null && req.getHelper().getId().equals(userId);

        if (!isRequester && !isHelper) {
            throw new BusinessException("권한이 없습니다.", HttpStatus.FORBIDDEN);
        }

        // 완료 처리 시 helper의 도움 횟수 증가 + 알림 발송
        if (newStatus == HelpRequest.RequestStatus.COMPLETED
                && req.getStatus() != HelpRequest.RequestStatus.COMPLETED
                && req.getHelper() != null) {
            User helper = req.getHelper();
            userRepository.incrementHelpCount(helper.getId());

            // 요청자에게 리뷰 안내 알림
            String reviewMsg = "'" + truncate(req.getTitle(), 15) + "' 도움이 완료됐어요. " + helper.getNickname() + "님에게 리뷰를 남겨보세요!";
            notificationService.createNotification(
                    req.getRequester().getId(),
                    Notification.NotificationType.REVIEW_REQUEST,
                    reviewMsg,
                    req.getId(),
                    Notification.ReferenceType.HELP_REQUEST
            );

            // helper에게 도움 완료 알림
            String completedMsg = "'" + truncate(req.getTitle(), 15) + "' 도움이 완료됐어요. 수고하셨습니다!";
            notificationService.createNotification(
                    helper.getId(),
                    Notification.NotificationType.HELP_COMPLETED,
                    completedMsg,
                    req.getId(),
                    Notification.ReferenceType.HELP_REQUEST
            );
        }

        req.setStatus(newStatus);
        return HelpRequestResponse.from(helpRequestRepository.save(req));
    }

    // 채팅방 나가기 (WAITING 복귀, helper 유지 - 상대방이 방을 볼 수 있도록)
    @Transactional
    public HelpRequestResponse leaveRequest(Long requestId, Long userId) {
        HelpRequest req = findById(requestId);

        boolean isRequester = req.getRequester().getId().equals(userId);
        boolean isHelper = req.getHelper() != null && req.getHelper().getId().equals(userId);

        if (!isRequester && !isHelper) {
            throw new BusinessException("권한이 없습니다.", HttpStatus.FORBIDDEN);
        }

        req.setStatus(HelpRequest.RequestStatus.WAITING);
        // helper는 유지 → 상대방(비퇴장자)이 findChatRooms 쿼리에서 여전히 방을 볼 수 있음
        return HelpRequestResponse.from(helpRequestRepository.save(req));
    }

    private HelpRequest findById(Long id) {
        return helpRequestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("요청을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}
