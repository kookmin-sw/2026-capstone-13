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

        String translatedContent = dto.getTranslatedContent();
        String culturalNote = null;
        String originalLanguage = dto.getOriginalLanguage();

        // AI 번역 + 뉘앙스 감지 (시스템 메시지 제외)
        String content = dto.getContent();
        boolean isSystemMessage = content != null && (
                content.startsWith("SYS_LEAVE:") ||
                content.startsWith("SYS_CALL_VOICE:") ||
                content.startsWith("SYS_CALL_VIDEO:")
        );

        if (!isSystemMessage && content != null && !content.isBlank()) {
            try {
                HelpRequest room = helpRequestRepository.findById(dto.getRoomId()).orElse(null);
                if (room != null) {
                    User partner = room.getRequester().getId().equals(dto.getSenderId())
                            ? room.getHelper() : room.getRequester();
                    String targetLang = (partner != null) ? partner.getPreferredLanguage() : "en";

                    String translateBody = objectMapper.writeValueAsString(
                            java.util.Map.of("text", content, "target_lang", targetLang)
                    );
                    HttpRequest translateRequest = HttpRequest.newBuilder()
                            .uri(URI.create(aiServerUrl + "/api/translate"))
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(translateBody))
                            .build();

                    HttpResponse<String> translateResponse = httpClient.send(translateRequest, HttpResponse.BodyHandlers.ofString());
                    JsonNode result = objectMapper.readTree(translateResponse.body());

                    if (result.path("success").asBoolean()) {
                        JsonNode data = result.path("data");
                        translatedContent = data.path("translated").asText(content);
                        originalLanguage = data.path("source_language").asText(originalLanguage);
                        if (!data.path("cultural_note").isNull()) {
                            culturalNote = data.path("cultural_note").asText(null);
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("[채팅] AI 번역/뉘앙스 감지 실패: {}", e.getMessage());
            }
        }

        ChatMessage message = ChatMessage.builder()
                .roomId(dto.getRoomId())
                .sender(sender)
                .content(content)
                .originalLanguage(originalLanguage)
                .translatedContent(translatedContent)
                .culturalNote(culturalNote)
                .isRead(false)
                .build();

        ChatMessage saved = chatMessageRepository.save(message);

        return ChatMessageDto.builder()
                .roomId(saved.getRoomId())
                .senderId(sender.getId())
                .senderNickname(sender.getNickname())
                .content(saved.getContent())
                .originalLanguage(saved.getOriginalLanguage())
                .translatedContent(saved.getTranslatedContent())
                .culturalNote(saved.getCulturalNote())
                .createdAt(saved.getCreatedAt().toString())
                .isRead(false)
                .build();
    }

    // 채팅방 메시지 읽음 처리 → WebSocket으로 상대방에게 읽음 이벤트 전파
    @Transactional
    public void markAsRead(Long roomId, Long userId) {
        int updated = chatMessageRepository.markAsRead(roomId, userId);
        if (updated > 0) {
            // 상대방 화면에서 "1" 제거하도록 읽음 이벤트 브로드캐스트
            messagingTemplate.convertAndSend("/topic/chat/" + roomId,
                    java.util.Map.of("type", "READ", "readerId", userId, "roomId", roomId));
        }
    }

    // 내가 참여한 채팅방 목록 조회 (마지막 메시지 기준 최신순)
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
                    long unreadCount = chatMessageRepository
                            .countByRoomIdAndSender_IdNotAndIsReadFalse(req.getId(), userId);
                    return ChatRoomResponse.from(
                            req, userId,
                            last != null ? resolveLastMessagePreview(last.getContent()) : null,
                            last != null ? last.getCreatedAt().toString() : null,
                            unreadCount
                    );
                })
                .sorted((a, b) -> {
                    if (a.getLastMessageTime() == null) return 1;
                    if (b.getLastMessageTime() == null) return -1;
                    return b.getLastMessageTime().compareTo(a.getLastMessageTime());
                })
                .collect(Collectors.toList());
    }

    // 채팅방 검색
    @Transactional(readOnly = true)
    public List<ChatRoomResponse> searchChatRooms(String keyword, Long userId) {
        List<HelpRequest.RequestStatus> activeStatuses = List.of(
                HelpRequest.RequestStatus.MATCHED,
                HelpRequest.RequestStatus.IN_PROGRESS,
                HelpRequest.RequestStatus.COMPLETED
        );
        return helpRequestRepository.searchByKeyword(keyword).stream()
                .filter(req -> activeStatuses.contains(req.getStatus())
                        && (req.getRequester().getId().equals(userId)
                        || (req.getHelper() != null && req.getHelper().getId().equals(userId))))
                .map(req -> {
                    ChatMessage last = chatMessageRepository
                            .findTopByRoomIdOrderByCreatedAtDesc(req.getId())
                            .orElse(null);
                    long unreadCount = chatMessageRepository
                            .countByRoomIdAndSender_IdNotAndIsReadFalse(req.getId(), userId);
                    return ChatRoomResponse.from(
                            req, userId,
                            last != null ? resolveLastMessagePreview(last.getContent()) : null,
                            last != null ? last.getCreatedAt().toString() : null,
                            unreadCount
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
        long unreadCount = chatMessageRepository
                .countByRoomIdAndSender_IdNotAndIsReadFalse(roomId, userId);
        return ChatRoomResponse.from(
                req, userId,
                last != null ? resolveLastMessagePreview(last.getContent()) : null,
                last != null ? last.getCreatedAt().toString() : null,
                unreadCount
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

    // 시스템 메시지를 읽을 수 있는 텍스트로 변환 (채팅방 목록 미리보기용)
    private String resolveLastMessagePreview(String content) {
        if (content == null) return null;
        if (content.startsWith("SYS_CALL_VOICE:")) return "[음성 통화]";
        if (content.startsWith("SYS_CALL_VIDEO:")) return "[영상 통화]";
        if (content.startsWith("SYS_LEAVE:")) return "[채팅방을 나갔습니다]";
        return content;
    }

    // 채팅방 메시지 이력 조회 + 자동 읽음 처리
    @Transactional
    public List<ChatMessageDto> getMessages(Long roomId, Long userId) {
        // 입장 시 상대방이 보낸 메시지 모두 읽음 처리
        markAsRead(roomId, userId);

        return chatMessageRepository.findByRoomIdOrderByCreatedAtAsc(roomId).stream()
                .map(msg -> ChatMessageDto.builder()
                        .roomId(msg.getRoomId())
                        .senderId(msg.getSender().getId())
                        .senderNickname(msg.getSender().getNickname())
                        .content(msg.getContent())
                        .originalLanguage(msg.getOriginalLanguage())
                        .translatedContent(msg.getTranslatedContent())
                        .culturalNote(msg.getCulturalNote())
                        .createdAt(msg.getCreatedAt().toString())
                        .isRead(msg.isRead())
                        .build())
                .collect(Collectors.toList());
    }
}
