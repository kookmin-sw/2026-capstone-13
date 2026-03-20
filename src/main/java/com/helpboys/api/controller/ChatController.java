package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.ChatMessageDto;
import com.helpboys.api.dto.ChatRoomResponse;
import com.helpboys.api.service.ChatService;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Controller
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtUtil jwtUtil;

    // WebSocket: /app/chat/send → 메시지 저장 후 /topic/chat/{roomId} 브로드캐스트
    @MessageMapping("/chat/send")
    public void sendMessage(@Payload ChatMessageDto messageDto) {
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

    // GET /api/chat/rooms/{roomId}/messages - 채팅 이력 조회
    @GetMapping("/rooms/{roomId}/messages")
    @ResponseBody
    public ResponseEntity<ApiResponse<List<ChatMessageDto>>> getMessages(@PathVariable Long roomId) {
        return ResponseEntity.ok(ApiResponse.success("조회 성공", chatService.getMessages(roomId)));
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
            byte[] audioBytes = audioFile.getBytes();
            ChatMessageDto result = chatService.saveVoiceMessage(roomId, senderId, audioBytes);
            return ResponseEntity.ok(ApiResponse.success("음성 메시지 전송 성공", result));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("음성 메시지 처리 실패: " + e.getMessage()));
        }
    }
}
