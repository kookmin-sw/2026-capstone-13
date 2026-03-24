package com.helpboys.api.service;

import com.helpboys.api.dto.ReportRequest;
import com.helpboys.api.dto.ReportResponse;
import com.helpboys.api.dto.UserBlockResponse;
import com.helpboys.api.entity.Report;
import com.helpboys.api.entity.User;
import com.helpboys.api.entity.UserBlock;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.ReportRepository;
import com.helpboys.api.repository.UserBlockRepository;
import com.helpboys.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserBlockRepository userBlockRepository;
    private final UserRepository userRepository;

    // 신고 접수
    @Transactional
    public ReportResponse createReport(ReportRequest request, Long reporterId) {
        if (reporterId.equals(request.getTargetUserId())) {
            throw new BusinessException("자기 자신을 신고할 수 없습니다.");
        }

        User reporter = findUser(reporterId);
        User targetUser = findUser(request.getTargetUserId());

        // 중복 신고 방지
        Long targetId = request.getTargetId();
        if (reportRepository.existsByReporterIdAndTargetUserIdAndTargetTypeAndTargetId(
                reporterId, request.getTargetUserId(), request.getTargetType(), targetId)) {
            throw new BusinessException("이미 신고한 대상입니다.");
        }

        Report report = Report.builder()
                .reporter(reporter)
                .targetUser(targetUser)
                .targetType(request.getTargetType())
                .targetId(targetId)
                .reason(request.getReason())
                .build();

        return ReportResponse.from(reportRepository.save(report));
    }

    // 유저 차단
    @Transactional
    public void blockUser(Long blockerId, Long blockedId) {
        if (blockerId.equals(blockedId)) {
            throw new BusinessException("자기 자신을 차단할 수 없습니다.");
        }

        if (userBlockRepository.existsByBlockerIdAndBlockedId(blockerId, blockedId)) {
            throw new BusinessException("이미 차단한 유저입니다.");
        }

        User blocker = findUser(blockerId);
        User blocked = findUser(blockedId);

        userBlockRepository.save(UserBlock.builder()
                .blocker(blocker)
                .blocked(blocked)
                .build());
    }

    // 유저 차단 해제
    @Transactional
    public void unblockUser(Long blockerId, Long blockedId) {
        UserBlock block = userBlockRepository.findByBlockerIdAndBlockedId(blockerId, blockedId)
                .orElseThrow(() -> new BusinessException("차단 내역이 없습니다.", HttpStatus.NOT_FOUND));
        userBlockRepository.delete(block);
    }

    // 내 차단 목록 조회
    @Transactional(readOnly = true)
    public List<UserBlockResponse> getBlockedUsers(Long blockerId) {
        return userBlockRepository.findByBlockerIdOrderByCreatedAtDesc(blockerId).stream()
                .map(UserBlockResponse::from)
                .collect(Collectors.toList());
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }
}