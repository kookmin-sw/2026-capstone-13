package com.helpboys.api.service;

import com.helpboys.api.dto.ChatMessageDto;
import com.helpboys.api.entity.ChatMessage;
import com.helpboys.api.entity.User;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.ChatMessageRepository;
import com.helpboys.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    // 채팅 메시지 저장 및 DTO 반환
    @Transactional
    public ChatMessageDto saveMessage(ChatMessageDto dto) {
        User sender = userRepository.findById(dto.getSenderId())
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        ChatMessage message = ChatMessage.builder()
                .roomId(dto.getRoomId())
                .sender(sender)
                .content(dto.getContent())
                .originalLanguage(dto.getOriginalLanguage())
                .translatedContent(dto.getTranslatedContent())
                .build();

        ChatMessage saved = chatMessageRepository.save(message);

        return ChatMessageDto.builder()
                .roomId(saved.getRoomId())
                .senderId(sender.getId())
                .senderNickname(sender.getNickname())
                .content(saved.getContent())
                .originalLanguage(saved.getOriginalLanguage())
                .translatedContent(saved.getTranslatedContent())
                .createdAt(saved.getCreatedAt().toString())
                .build();
    }

    // 채팅방 메시지 이력 조회
    @Transactional(readOnly = true)
    public List<ChatMessageDto> getMessages(Long roomId) {
        return chatMessageRepository.findByRoomIdOrderByCreatedAtAsc(roomId).stream()
                .map(msg -> ChatMessageDto.builder()
                        .roomId(msg.getRoomId())
                        .senderId(msg.getSender().getId())
                        .senderNickname(msg.getSender().getNickname())
                        .content(msg.getContent())
                        .originalLanguage(msg.getOriginalLanguage())
                        .translatedContent(msg.getTranslatedContent())
                        .createdAt(msg.getCreatedAt().toString())
                        .build())
                .collect(Collectors.toList());
    }
}
