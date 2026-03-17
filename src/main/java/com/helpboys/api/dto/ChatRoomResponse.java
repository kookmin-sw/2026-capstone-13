package com.helpboys.api.dto;

import com.helpboys.api.entity.HelpRequest;
import com.helpboys.api.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class ChatRoomResponse {

    private Long id;               // roomId (= helpRequestId)
    private String title;          // 도움 요청 제목
    private Long partnerId;        // 상대방 ID
    private String partnerNickname;
    private String status;         // MATCHED, IN_PROGRESS, COMPLETED
    private String lastMessage;    // 마지막 메시지 내용 (없으면 null)
    private String lastMessageTime;

    public static ChatRoomResponse from(HelpRequest req, Long myUserId, String lastMessage, String lastMessageTime) {
        User partner = req.getRequester().getId().equals(myUserId)
                ? req.getHelper()
                : req.getRequester();

        return ChatRoomResponse.builder()
                .id(req.getId())
                .title(req.getTitle())
                .partnerId(partner != null ? partner.getId() : null)
                .partnerNickname(partner != null ? partner.getNickname() : null)
                .status(req.getStatus().name())
                .lastMessage(lastMessage)
                .lastMessageTime(lastMessageTime)
                .build();
    }
}
