package com.helpboys.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.helpboys.api.dto.ChatMessageDto;
import com.helpboys.api.dto.ChatRoomResponse;
import com.helpboys.api.entity.ChatMessage;
import com.helpboys.api.entity.HelpRequest;
import com.helpboys.api.entity.User;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.ChatMessageRepository;
import com.helpboys.api.repository.HelpRequestRepository;
import com.helpboys.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final HelpRequestRepository helpRequestRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${ai.server.url:http://localhost:8000}")
    private String aiServerUrl;

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

    // 내가 참여한 채팅방 목록 조회
    @Transactional(readOnly = true)
    public List<ChatRoomResponse> getChatRooms(Long userId) {
        List<HelpRequest.RequestStatus> activeStatuses = List.of(
                HelpRequest.RequestStatus.MATCHED,
                HelpRequest.RequestStatus.IN_PROGRESS,
                HelpRequest.RequestStatus.COMPLETED
        );
        return helpRequestRepository.findChatRooms(userId, activeStatuses).stream()
                .map(req -> {
                    ChatMessage last = chatMessageRepository
                            .findTopByRoomIdOrderByCreatedAtDesc(req.getId())
                            .orElse(null);
                    return ChatRoomResponse.from(
                            req, userId,
                            last != null ? last.getContent() : null,
                            last != null ? last.getCreatedAt().toString() : null
                    );
                })
                .collect(Collectors.toList());
    }

    // 채팅방 단건 조회
    @Transactional(readOnly = true)
    public ChatRoomResponse getChatRoom(Long roomId, Long userId) {
        HelpRequest req = helpRequestRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException("채팅방을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        boolean isParticipant = req.getRequester().getId().equals(userId)
                || (req.getHelper() != null && req.getHelper().getId().equals(userId));
        if (!isParticipant) {
            throw new BusinessException("접근 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }

        ChatMessage last = chatMessageRepository
                .findTopByRoomIdOrderByCreatedAtDesc(roomId)
                .orElse(null);
        return ChatRoomResponse.from(
                req, userId,
                last != null ? last.getContent() : null,
                last != null ? last.getCreatedAt().toString() : null
        );
    }

    // 음성 메시지 저장: AI 서버로 음성→텍스트 변환 후 채팅 저장
    @Transactional
    public ChatMessageDto saveVoiceMessage(Long roomId, Long senderId, byte[] audioBytes) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        HelpRequest room = helpRequestRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException("채팅방을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        // 파트너(상대방) 찾기 → 파트너의 선호 언어로 번역
        User partner = room.getRequester().getId().equals(senderId)
                ? room.getHelper()
                : room.getRequester();
        String targetLang = (partner != null) ? partner.getPreferredLanguage() : "en";

        // 1단계: AI 서버에 음성→텍스트 요청
        String recognizedText = "";
        String detectedLanguage = "ko";
        try {
            HttpRequest speechRequest = HttpRequest.newBuilder()
                    .uri(URI.create(aiServerUrl + "/api/speech-to-text"))
                    .header("Content-Type", "audio/wav")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(audioBytes))
                    .build();

            HttpResponse<String> speechResponse = httpClient.send(speechRequest, HttpResponse.BodyHandlers.ofString());
            JsonNode speechResult = objectMapper.readTree(speechResponse.body());

            if (speechResult.path("success").asBoolean()) {
                JsonNode data = speechResult.path("data");
                recognizedText = data.path("text").asText("");
                detectedLanguage = data.path("language").asText("ko");
                // Azure Speech는 ko-KR 형태로 반환하므로 앞 두 글자만 사용
                if (detectedLanguage.contains("-")) {
                    detectedLanguage = detectedLanguage.split("-")[0];
                }
            }
        } catch (Exception e) {
            log.error("[음성 메시지] AI 서버 음성 인식 실패: {}", e.getMessage());
        }

        // 2단계: AI 서버에 번역 요청
        String translatedText = recognizedText;
        try {
            if (!recognizedText.isBlank() && !detectedLanguage.equals(targetLang)) {
                String translateBody = objectMapper.writeValueAsString(
                        java.util.Map.of("text", recognizedText, "target_lang", targetLang, "source_lang", detectedLanguage)
                );
                HttpRequest translateRequest = HttpRequest.newBuilder()
                        .uri(URI.create(aiServerUrl + "/api/translate"))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(translateBody))
                        .build();

                HttpResponse<String> translateResponse = httpClient.send(translateRequest, HttpResponse.BodyHandlers.ofString());
                JsonNode translateResult = objectMapper.readTree(translateResponse.body());

                if (translateResult.path("success").asBoolean()) {
                    translatedText = translateResult.path("data").path("translated").asText(recognizedText);
                }
            }
        } catch (Exception e) {
            log.error("[음성 메시지] AI 서버 번역 실패: {}", e.getMessage());
        }

        // 3단계: 채팅 메시지 저장
        ChatMessage message = ChatMessage.builder()
                .roomId(roomId)
                .sender(sender)
                .content(recognizedText.isBlank() ? "[음성 메시지]" : recognizedText)
                .originalLanguage(detectedLanguage)
                .translatedContent(translatedText)
                .build();

        ChatMessage saved = chatMessageRepository.save(message);

        ChatMessageDto dto = ChatMessageDto.builder()
                .roomId(saved.getRoomId())
                .senderId(sender.getId())
                .senderNickname(sender.getNickname())
                .content(saved.getContent())
                .originalLanguage(saved.getOriginalLanguage())
                .translatedContent(saved.getTranslatedContent())
                .createdAt(saved.getCreatedAt().toString())
                .build();

        // 4단계: WebSocket으로 브로드캐스트
        messagingTemplate.convertAndSend("/topic/chat/" + roomId, dto);

        return dto;
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
