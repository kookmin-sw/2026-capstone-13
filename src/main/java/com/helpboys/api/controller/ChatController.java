package com.helpboys.api.controller;

import com.helpboys.api.dto.ApiResponse;
import com.helpboys.api.dto.ChatMessageDto;
import com.helpboys.api.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;

@Controller
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    // WebSocket: /app/chat/send → 메시지 저장 후 /topic/chat/{roomId} 브로드캐스트
    @MessageMapping("/chat/send")
    public void sendMessage(@Payload ChatMessageDto messageDto) {
        ChatMessageDto saved = chatService.saveMessage(messageDto);
        messagingTemplate.convertAndSend("/topic/chat/" + saved.getRoomId(), saved);
    }

    // GET /api/chat/rooms/{roomId}/messages - 채팅 이력 조회
    @GetMapping("/rooms/{roomId}/messages")
    @ResponseBody
    public ResponseEntity<ApiResponse<List<ChatMessageDto>>> getMessages(@PathVariable Long roomId) {
        return ResponseEntity.ok(ApiResponse.success("조회 성공", chatService.getMessages(roomId)));
    }
}
