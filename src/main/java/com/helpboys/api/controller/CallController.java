package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.CallSignalDto;
import com.helpboys.api.entity.User;
import com.helpboys.api.repository.UserRepository;
import com.helpboys.api.service.ChatService;
import com.helpboys.api.service.FcmService;
import com.helpboys.api.util.JwtUtil;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

/**
 * WebRTC 시그널링 컨트롤러
 *
 * 클라이언트 구독 채널: /topic/call/{userId}
 * 클라이언트 전송 경로: /app/call/signal
 *
 * 백엔드는 시그널 메시지를 상대방에게 중계(relay)만 합니다.
 * 실제 음성 데이터는 WebRTC P2P로 클라이언트끼리 직접 전송됩니다.
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class
        CallController {
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final ChatService chatService;
    private final FcmService fcmService;
    private final JwtUtil jwtUtil;

    /**
     * /app/call/signal 로 수신한 모든 WebRTC 시그널을
     * 상대방의 /topic/call/{toUserId} 채널로 중계합니다.
     *
     * 지원 type:
     *   call-invite   → 수신자에게 전화 알림 전송
     *   call-accepted → 발신자에게 수락 신호 전달
     *   call-rejected → 발신자에게 거절 신호 전달
     *   offer         → 수신자에게 SDP offer 전달
     *   answer        → 발신자에게 SDP answer 전달
     *   ice-candidate → 상대방에게 ICE candidate 전달
     *   call-end      → 상대방에게 종료 신호 전달
     */
    @MessageMapping("/call/signal")
    public void handleSignal(@Payload CallSignalDto signal) {
        if (signal.getToUserId() == null || signal.getFromUserId() == null) {
            log.warn("[WebRTC] fromUserId 또는 toUserId 누락, 무시합니다.");
            return;
        }

        // call-invite 시 발신자 닉네임을 자동으로 채워줌
        if ("call-invite".equals(signal.getType()) && signal.getCallerNickname() == null) {
            userRepository.findById(signal.getFromUserId())
                    .map(User::getNickname)
                    .ifPresent(signal::setCallerNickname);
        }

        log.info("[WebRTC] type={} from={} to={} room={}",
                signal.getType(), signal.getFromUserId(),
                signal.getToUserId(), signal.getRoomId());

        // call-invite 시 수신자가 앱 밖에 있어도 알림 받도록 FCM 푸시 전송
        if ("call-invite".equals(signal.getType())) {
            userRepository.findById(signal.getToUserId()).ifPresent(receiver -> {
                if (receiver.getFcmToken() != null) {
                    String callerName = signal.getCallerNickname() != null
                            ? signal.getCallerNickname() : "상대방";
                    fcmService.sendPushWithData(
                            receiver.getFcmToken(),
                            callerName,
                            "전화가 왔습니다",
                            Map.of(
                                "type", "CALL_INVITE",
                                "fromUserId", String.valueOf(signal.getFromUserId()),
                                "roomId", signal.getRoomId() != null ? String.valueOf(signal.getRoomId()) : ""
                            )
                    );
                }
            });
        }

        // 상대방 개인 채널로 시그널 전달
        messagingTemplate.convertAndSend(
                "/topic/call/" + signal.getToUserId(),
                signal
        );
    }

    /**
     * POST /api/call/subtitle
     * 통화 중 음성 청크를 받아 STT → 번역 → 상대방에게 자막 이벤트 전송
     *
     * @param audioFile  1~2초 단위 음성 청크 (audio/wav)
     * @param toUserId   자막을 받을 상대방 userId
     */
    @PostMapping("/api/call/subtitle")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> processSubtitle(
            @RequestParam("audio") MultipartFile audioFile,
            @RequestParam("toUserId") Long toUserId,
            @RequestHeader("Authorization") String token) {
        try {
            Long fromUserId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
            chatService.processCallSubtitle(audioFile.getBytes(), fromUserId, toUserId);
            return ResponseEntity.ok(ApiResponse.success("자막 처리 완료", null));
        } catch (Exception e) {
            log.warn("[자막] 처리 실패: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.success("자막 처리 실패 (무시)", null));
        }
    }
}