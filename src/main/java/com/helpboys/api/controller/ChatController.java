package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.ChatMessageDto;
import com.helpboys.api.dto.ChatRoomResponse;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.util.RateLimiter;
import com.helpboys.api.service.ChatService;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

@Controller
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtUtil jwtUtil;
    private final RateLimiter rateLimiter;

    // WebSocket: /app/chat/send → 메시지 저장 후 /topic/chat/{roomId} 브로드캐스트
    @MessageMapping("/chat/send")
    public void sendMessage(@Payload ChatMessageDto messageDto, Principal principal) {
        if (principal == null) return; // 인증 안 된 연결 차단
        // 클라이언트가 보낸 senderId 무시 → 토큰에서 추출한 userId로 강제 교체
        messageDto.setSenderId(Long.parseLong(principal.getName()));
        ChatMessageDto saved = chatService.saveMessage(messageDto);
        messagingTemplate.convertAndSend("/topic/chat/" + saved.getRoomId(), saved);
    }

    // GET /api/chat/rooms - 내 채팅방 목록
    @GetMapping("/rooms")
    @ResponseBody
    public ResponseEntity<ApiResponse<List<ChatRoomResponse>>> getChatRooms(
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        return ResponseEntity.ok(ApiResponse.success("조회 성공", chatService.getChatRooms(userId)));
    }

    // GET /api/chat/rooms/search?keyword=... - 채팅방 검색
    @GetMapping("/rooms/search")
    @ResponseBody
    public ResponseEntity<ApiResponse<List<ChatRoomResponse>>> searchChatRooms(
            @RequestParam String keyword,
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        return ResponseEntity.ok(ApiResponse.success("검색 성공", chatService.searchChatRooms(keyword, userId)));
    }

    // GET /api/chat/rooms/{roomId} - 채팅방 단건 조회
    @GetMapping("/rooms/{roomId}")
    @ResponseBody
    public ResponseEntity<ApiResponse<ChatRoomResponse>> getChatRoom(
            @PathVariable Long roomId,
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        return ResponseEntity.ok(ApiResponse.success("조회 성공", chatService.getChatRoom(roomId, userId)));
    }

    // GET /api/chat/rooms/{roomId}/messages - 채팅 이력 조회 (자동 읽음 처리)
    @GetMapping("/rooms/{roomId}/messages")
    @ResponseBody
    public ResponseEntity<ApiResponse<List<ChatMessageDto>>> getMessages(
            @PathVariable Long roomId,
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        return ResponseEntity.ok(ApiResponse.success("조회 성공", chatService.getMessages(roomId, userId)));
    }

    // PATCH /api/chat/rooms/{roomId}/read - 명시적 읽음 처리 (채팅방 열어둔 상태에서 새 메시지 수신 시)
    @PatchMapping("/rooms/{roomId}/read")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable Long roomId,
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        chatService.markAsRead(roomId, userId);
        return ResponseEntity.ok(ApiResponse.success("읽음 처리 완료", null));
    }

    // POST /api/chat/messages/{messageId}/translate - 메시지 온디맨드 번역
    @PostMapping("/messages/{messageId}/translate")
    @ResponseBody
    public ResponseEntity<ApiResponse<ChatMessageDto>> translateMessage(
            @PathVariable Long messageId,
            @RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
        return ResponseEntity.ok(ApiResponse.success("번역 완료", chatService.translateMessage(messageId, userId)));
    }

    // POST /api/chat/rooms/{roomId}/voice-message - 음성 메시지 전송
    @PostMapping("/rooms/{roomId}/voice-message")
    @ResponseBody
    public ResponseEntity<ApiResponse<ChatMessageDto>> sendVoiceMessage(
            @PathVariable Long roomId,
            @RequestParam("audio") MultipartFile audioFile,
            @RequestHeader("Authorization") String token) {
        try {
            Long senderId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
            if (!rateLimiter.isAllowed("voice:min:" + senderId, 10, 60) ||
                !rateLimiter.isAllowed("voice:day:" + senderId, 100, 86400)) {
                throw new BusinessException("음성 메시지 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
            }
            String contentType = audioFile.getContentType();
            if (contentType == null || !contentType.startsWith("audio/")) {
                throw new BusinessException("오디오 파일만 업로드할 수 있습니다.");
            }
            byte[] audioBytes = audioFile.getBytes();
            ChatMessageDto result = chatService.saveVoiceMessage(roomId, senderId, audioBytes);
            return ResponseEntity.ok(ApiResponse.success("음성 메시지 전송 성공", result));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("음성 메시지 처리 실패: " + e.getMessage()));
        }
    }
}
