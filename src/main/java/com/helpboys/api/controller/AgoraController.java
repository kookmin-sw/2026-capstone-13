package com.helpboys.api.controller;

import com.helpboys.api.dto.AgoraTokenResponse;
import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.entity.DirectChatRoom;
import com.helpboys.api.entity.HelpRequest;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.DirectChatRoomRepository;
import com.helpboys.api.repository.HelpRequestRepository;
import com.helpboys.api.service.AgoraService;
import com.helpboys.api.util.JwtUtil;
import com.helpboys.api.util.RateLimiter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/agora")
@RequiredArgsConstructor
public class AgoraController {

    private final AgoraService agoraService;
    private final JwtUtil jwtUtil;
    private final RateLimiter rateLimiter;
    private final HelpRequestRepository helpRequestRepository;
    private final DirectChatRoomRepository directChatRoomRepository;

    // GET /api/agora/token?channelName=room_1
    @GetMapping("/token")
    public ResponseEntity<ApiResponse<AgoraTokenResponse>> generateToken(
            @RequestParam String channelName,
            @RequestHeader("Authorization") String token) {

        Long userId = jwtUtil.extractUserIdFromBearer(token);
        if (!rateLimiter.isAllowed("agora:min:" + userId, 5, 60) ||
            !rateLimiter.isAllowed("agora:day:" + userId, 20, 86400)) {
            throw new BusinessException("토큰 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", HttpStatus.TOO_MANY_REQUESTS);
        }
        validateChannelAccess(channelName, userId);
        AgoraTokenResponse response = agoraService.generateToken(channelName, userId);
        return ResponseEntity.ok(ApiResponse.success("토큰 생성 성공", response));
    }

    private void validateChannelAccess(String channelName, Long userId) {
        if (channelName == null || !channelName.matches("^room_\\d+$")) {
            throw new BusinessException("유효하지 않은 통화 채널입니다.", HttpStatus.BAD_REQUEST);
        }

        Long roomId = Long.parseLong(channelName.substring("room_".length()));
        boolean helpRoomParticipant = helpRequestRepository.findById(roomId)
                .map(room -> isHelpRoomParticipant(room, userId))
                .orElse(false);
        boolean directRoomParticipant = directChatRoomRepository.findById(roomId)
                .map(room -> isDirectRoomParticipant(room, userId))
                .orElse(false);

        if (!helpRoomParticipant && !directRoomParticipant) {
            throw new BusinessException("통화 채널 접근 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
    }

    private boolean isHelpRoomParticipant(HelpRequest room, Long userId) {
        return room.getRequester().getId().equals(userId)
                || (room.getHelper() != null && room.getHelper().getId().equals(userId));
    }

    private boolean isDirectRoomParticipant(DirectChatRoom room, Long userId) {
        return room.getUser1().getId().equals(userId) || room.getUser2().getId().equals(userId);
    }
}
