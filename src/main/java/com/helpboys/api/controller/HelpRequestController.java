package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.HelpRequestRequest;
import com.helpboys.api.dto.HelpRequestResponse;
import com.helpboys.api.dto.ReviewRequest;
import com.helpboys.api.dto.ReviewResponse;
import com.helpboys.api.entity.HelpRequest;
import com.helpboys.api.service.HelpRequestService;
import com.helpboys.api.service.ReviewService;
import com.helpboys.api.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requests")
@RequiredArgsConstructor
public class HelpRequestController {

    private final HelpRequestService helpRequestService;
    private final ReviewService reviewService;
    private final JwtUtil jwtUtil;

    // GET /api/requests - 전체 목록 조회
    @GetMapping
    public ResponseEntity<ApiResponse<List<HelpRequestResponse>>> getAllRequests(
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", helpRequestService.getAllRequests(userId)));
    }

    // GET /api/requests/waiting - 대기 중인 요청만 조회
    @GetMapping("/waiting")
    public ResponseEntity<ApiResponse<List<HelpRequestResponse>>> getWaitingRequests(
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", helpRequestService.getWaitingRequests(userId)));
    }

    // GET /api/requests/my - 내가 등록한 요청
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<HelpRequestResponse>>> getMyRequests(
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", helpRequestService.getMyRequests(userId)));
    }

    // GET /api/requests/helped - 내가 도움을 준 요청
    @GetMapping("/helped")
    public ResponseEntity<ApiResponse<List<HelpRequestResponse>>> getHelpedRequests(
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", helpRequestService.getHelpedRequests(userId)));
    }

    // GET /api/requests/{id} - 단건 조회
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<HelpRequestResponse>> getRequestById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("조회 성공", helpRequestService.getRequestById(id)));
    }

    // POST /api/requests - 도움 요청 등록 (유학생)
    @PostMapping
    public ResponseEntity<ApiResponse<HelpRequestResponse>> createRequest(
            @Valid @RequestBody HelpRequestRequest request,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        HelpRequestResponse response = helpRequestService.createRequest(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("도움 요청이 등록되었습니다.", response));
    }

    // PUT /api/requests/{id} - 도움 요청 수정 (작성자만)
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<HelpRequestResponse>> updateRequest(
            @PathVariable Long id,
            @Valid @RequestBody HelpRequestRequest request,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("수정되었습니다.", helpRequestService.updateRequest(id, request, userId)));
    }

    // POST /api/requests/{id}/accept - 도움 수락 (한국인 학생)
    @PostMapping("/{id}/accept")
    public ResponseEntity<ApiResponse<HelpRequestResponse>> acceptRequest(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("도움 요청을 수락했습니다.", helpRequestService.acceptRequest(id, userId)));
    }

    // POST /api/requests/{id}/reject - 도움 신청 거절 (외국인 학생)
    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<HelpRequestResponse>> rejectHelper(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("거절되었습니다.", helpRequestService.rejectHelper(id, userId)));
    }

    // POST /api/requests/{id}/complete - 도움 완료 처리
    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<HelpRequestResponse>> completeRequest(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("도움이 완료되었습니다.",
                helpRequestService.updateStatus(id, HelpRequest.RequestStatus.COMPLETED, userId)));
    }

    // PATCH /api/requests/{id}/status - 상태 변경
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<HelpRequestResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam HelpRequest.RequestStatus status,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("상태가 변경되었습니다.", helpRequestService.updateStatus(id, status, userId)));
    }

    // POST /api/requests/{id}/review - 리뷰 작성 (요청자만, 완료된 요청에 한해)
    @PostMapping("/{id}/review")
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @PathVariable Long id,
            @Valid @RequestBody ReviewRequest request,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("리뷰가 등록되었습니다.", reviewService.createReview(id, request, userId)));
    }

    private Long extractUserId(String bearerToken) {
        String token = bearerToken.replace("Bearer ", "");
        return jwtUtil.extractUserId(token);
    }
}
