package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.ChatMessageDto;
import com.helpboys.api.dto.DirectChatRoomResponse;
import com.helpboys.api.service.DirectChatService;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/api/direct-chat")
@RequiredArgsConstructor
public class DirectChatController {

    private final DirectChatService directChatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtUtil jwtUtil;

    // WebSocket: /app/direct-chat/send → 저장 후 /topic/direct/{roomId} 브로드캐스트
    @MessageMapping("/direct-chat/send")
    public void sendMessage(@Payload ChatMessageDto messageDto, Principal principal) {
        if (principal == null) return;
        messageDto.setSenderId(Long.parseLong(principal.getName()));
        ChatMessageDto saved = directChatService.saveMessage(messageDto);
        messagingTemplate.convertAndSend("/topic/direct/" + saved.getRoomId(), saved);
    }

    // POST /api/direct-chat/rooms - 채팅방 생성 또는 조회
    @PostMapping("/rooms")
    @ResponseBody
    public ResponseEntity<ApiResponse<DirectChatRoomResponse>> getOrCreateRoom(
            @RequestBody Map<String, Long> body,
            @RequestHeader("Authorization") String token) {
        Long myId = extractUserId(token);
        Long targetId = body.get("targetUserId");
        return ResponseEntity.ok(ApiResponse.success("채팅방 조회 성공", directChatService.getOrCreateRoom(myId, targetId)));
    }

    // GET /api/direct-chat/rooms - 내 DM 목록
    @GetMapping("/rooms")
    @ResponseBody
    public ResponseEntity<ApiResponse<List<DirectChatRoomResponse>>> getRooms(
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", directChatService.getRooms(userId)));
    }

    // GET /api/direct-chat/rooms/{roomId}/messages - 메시지 이력
    @GetMapping("/rooms/{roomId}/messages")
    @ResponseBody
    public ResponseEntity<ApiResponse<List<ChatMessageDto>>> getMessages(
            @PathVariable Long roomId,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        return ResponseEntity.ok(ApiResponse.success("조회 성공", directChatService.getMessages(roomId, userId)));
    }

    // PATCH /api/direct-chat/rooms/{roomId}/read - 읽음 처리
    @PatchMapping("/rooms/{roomId}/read")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable Long roomId,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        directChatService.markAsRead(roomId, userId);
        return ResponseEntity.ok(ApiResponse.success("읽음 처리 완료", null));
    }

    // POST /api/direct-chat/rooms/{roomId}/leave - 나가기
    @PostMapping("/rooms/{roomId}/leave")
    @ResponseBody
    public ResponseEntity<ApiResponse<Void>> leaveRoom(
            @PathVariable Long roomId,
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserId(token);
        directChatService.leaveRoom(roomId, userId);
        return ResponseEntity.ok(ApiResponse.success("채팅방을 나갔습니다.", null));
    }

    private Long extractUserId(String bearerToken) {
        return jwtUtil.extractUserIdFromBearer(bearerToken);
    }
}
