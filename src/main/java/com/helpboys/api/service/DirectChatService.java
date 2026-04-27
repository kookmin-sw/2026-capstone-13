package com.helpboys.api.service;

import com.helpboys.api.dto.ChatMessageDto;
import com.helpboys.api.dto.DirectChatRoomResponse;
import com.helpboys.api.entity.DirectChatMessage;
import com.helpboys.api.entity.DirectChatRoom;
import com.helpboys.api.entity.User;
import com.helpboys.api.entity.UserBlock;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.DirectChatMessageRepository;
import com.helpboys.api.repository.DirectChatRoomRepository;
import com.helpboys.api.repository.UserBlockRepository;
import com.helpboys.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DirectChatService {

    private final DirectChatRoomRepository roomRepository;
    private final DirectChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final FcmService fcmService;

    // 두 유저 간 채팅방 생성 또는 조회
    @Transactional
    public DirectChatRoomResponse getOrCreateRoom(Long myUserId, Long targetUserId) {
        if (myUserId.equals(targetUserId)) {
            throw new BusinessException("자기 자신과 채팅할 수 없습니다.");
        }

        User me = findUser(myUserId);
        User target = findUser(targetUserId);

        DirectChatRoom room = roomRepository.findByUsers(myUserId, targetUserId).orElseGet(() ->
            roomRepository.save(DirectChatRoom.builder().user1(me).user2(target).build())
        );

        // 내가 나갔던 방이면 재입장 처리
        if (room.getUser1().getId().equals(myUserId) && room.isLeftByUser1()) {
            room.setLeftByUser1(false);
            room = roomRepository.save(room);
        } else if (room.getUser2().getId().equals(myUserId) && room.isLeftByUser2()) {
            room.setLeftByUser2(false);
            room = roomRepository.save(room);
        }

        List<Long> myBlockedIds = userBlockRepository.findBlockedIdsByBlockerId(myUserId);
        List<Long> excludeIds = myBlockedIds.isEmpty() ? List.of(-1L) : myBlockedIds;
        DirectChatMessage last = messageRepository
                .findByRoomExcludingOrderByCreatedAtDesc(room.getId(), excludeIds, PageRequest.of(0, 1))
                .stream().findFirst().orElse(null);
        long unread = messageRepository.countUnreadMessagesExcluding(room.getId(), myUserId, excludeIds);
        return DirectChatRoomResponse.from(room, myUserId,
                last != null ? last.getContent() : null,
                last != null ? last.getCreatedAt().toString() : null,
                unread);
    }

    // 내 DM 방 목록 (내가 나가지 않은 방 + 메시지 있는 방만)
    @Transactional(readOnly = true)
    public List<DirectChatRoomResponse> getRooms(Long userId) {
        List<Long> myBlockedIds = userBlockRepository.findBlockedIdsByBlockerId(userId);
        List<Long> excludeIds = myBlockedIds.isEmpty() ? List.of(-1L) : myBlockedIds;
        return roomRepository.findByUserId(userId).stream()
                .filter(r -> {
                    boolean iLeftByUser1 = r.getUser1().getId().equals(userId) && r.isLeftByUser1();
                    boolean iLeftByUser2 = r.getUser2().getId().equals(userId) && r.isLeftByUser2();
                    return !iLeftByUser1 && !iLeftByUser2;
                })
                .map(r -> {
                    DirectChatMessage last = messageRepository
                            .findByRoomExcludingOrderByCreatedAtDesc(r.getId(), excludeIds, PageRequest.of(0, 1))
                            .stream().findFirst().orElse(null);
                    if (last == null) return null;
                    long unread = messageRepository.countUnreadMessagesExcluding(r.getId(), userId, excludeIds);
                    return DirectChatRoomResponse.from(r, userId,
                            last.getContent(),
                            last.getCreatedAt().toString(),
                            unread);
                })
                .filter(Objects::nonNull)
                .sorted((a, b) -> {
                    if (a.getLastMessageTime() == null) return 1;
                    if (b.getLastMessageTime() == null) return -1;
                    return b.getLastMessageTime().compareTo(a.getLastMessageTime());
                })
                .collect(Collectors.toList());
    }

    // 메시지 이력 + 읽음 처리
    @Transactional
    public List<ChatMessageDto> getMessages(Long roomId, Long userId) {
        DirectChatRoom room = findRoom(roomId);
        if (!isParticipant(room, userId)) {
            throw new BusinessException("접근 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
        markAsRead(roomId, userId);
        // 차단 시점 이후 메시지만 숨김 (차단 전 메시지는 유지)
        List<UserBlock> blocks = userBlockRepository.findByBlockerIdOrderByCreatedAtDesc(userId);
        Map<Long, LocalDateTime> blockTimeMap = blocks.stream()
                .collect(Collectors.toMap(ub -> ub.getBlocked().getId(), UserBlock::getCreatedAt));
        return messageRepository.findByRoom_IdOrderByCreatedAtAsc(roomId).stream()
                .filter(m -> {
                    LocalDateTime blockTime = blockTimeMap.get(m.getSender().getId());
                    if (blockTime == null) return true;
                    return m.getCreatedAt().isBefore(blockTime);
                })
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    // 메시지 저장 + 브로드캐스트
    @Transactional
    public ChatMessageDto saveMessage(ChatMessageDto dto) {
        DirectChatRoom room = findRoom(dto.getRoomId());
        User sender = findUser(dto.getSenderId());

        if (!isParticipant(room, sender.getId())) {
            throw new BusinessException("접근 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }

        // 나갔던 사람이 다시 메시지 보내면 재입장 처리
        if (room.getUser1().getId().equals(sender.getId()) && room.isLeftByUser1()) {
            room.setLeftByUser1(false);
        } else if (room.getUser2().getId().equals(sender.getId()) && room.isLeftByUser2()) {
            room.setLeftByUser2(false);
        }
        room.setUpdatedAt(LocalDateTime.now());
        roomRepository.save(room);

        DirectChatMessage saved = messageRepository.save(DirectChatMessage.builder()
                .room(room)
                .sender(sender)
                .content(dto.getContent())
                .build());

        ChatMessageDto result = toDto(saved);

        User receiver = room.getUser1().getId().equals(sender.getId()) ? room.getUser2() : room.getUser1();

        // 수신자가 발신자를 차단한 경우 브로드캐스트/알림 생략
        boolean receiverBlockedSender = userBlockRepository.existsByBlockerIdAndBlockedId(receiver.getId(), sender.getId());
        if (!receiverBlockedSender) {
            long unread = messageRepository.countUnreadMessages(room.getId(), receiver.getId());
            messagingTemplate.convertAndSend("/topic/user/" + receiver.getId(),
                    Map.of("type", "UNREAD_UPDATE", "directRoomId", room.getId(), "unreadCount", unread));

            if (receiver.getFcmToken() != null) {
                try {
                    String preview = dto.getContent() != null && dto.getContent().length() > 50
                            ? dto.getContent().substring(0, 50) + "…" : dto.getContent();
                    fcmService.sendPush(receiver.getFcmToken(), sender.getNickname(), preview);
                } catch (Exception e) {
                    log.warn("[FCM] DM 푸시 전송 실패: {}", e.getMessage());
                }
            }
        }

        return result;
    }

    // 읽음 처리
    @Transactional
    public void markAsRead(Long roomId, Long userId) {
        int updated = messageRepository.markAsRead(roomId, userId);
        if (updated > 0) {
            messagingTemplate.convertAndSend("/topic/direct/" + roomId,
                    Map.of("type", "READ", "readerId", userId, "roomId", roomId));
            messagingTemplate.convertAndSend("/topic/user/" + userId,
                    Map.of("type", "UNREAD_UPDATE", "directRoomId", roomId, "unreadCount", 0));
        }
    }

    // 나가기
    @Transactional
    public void leaveRoom(Long roomId, Long userId) {
        DirectChatRoom room = findRoom(roomId);
        if (!isParticipant(room, userId)) {
            throw new BusinessException("접근 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
        if (room.getUser1().getId().equals(userId)) room.setLeftByUser1(true);
        else room.setLeftByUser2(true);
        room.setUpdatedAt(LocalDateTime.now());
        roomRepository.save(room);
    }

    private DirectChatRoom findRoom(Long roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException("채팅방을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    private boolean isParticipant(DirectChatRoom room, Long userId) {
        return room.getUser1().getId().equals(userId) || room.getUser2().getId().equals(userId);
    }

    private ChatMessageDto toDto(DirectChatMessage msg) {
        return ChatMessageDto.builder()
                .id(msg.getId())
                .roomId(msg.getRoom().getId())
                .senderId(msg.getSender().getId())
                .senderNickname(msg.getSender().getNickname())
                .content(msg.getContent())
                .createdAt(msg.getCreatedAt().toString())
                .isRead(msg.isRead())
                .build();
    }
}
