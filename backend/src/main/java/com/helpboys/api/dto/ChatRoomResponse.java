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
    private String partnerProfileImage;
    private String status;         // MATCHED, IN_PROGRESS, COMPLETED
    private String lastMessage;    // 마지막 메시지 내용 (없으면 null)
    private String lastMessageTime;
    private long unreadCount;      // 내가 안 읽은 메시지 수 (뱃지)
    private String partnerPreferredLanguage; // 상대방 번역 수신 언어 (한국인=ko, 외국인=preferredLanguage)

    public static ChatRoomResponse from(HelpRequest req, Long myUserId, String lastMessage, String lastMessageTime, long unreadCount) {
        User partner = req.getRequester().getId().equals(myUserId)
                ? req.getHelper()
                : req.getRequester();

        String partnerLang = null;
        if (partner != null) {
            partnerLang = partner.getUserType() == User.UserType.KOREAN
                    ? "ko"
                    : partner.getPreferredLanguage();
        }

        return ChatRoomResponse.builder()
                .id(req.getId())
                .title(req.getTitle())
                .partnerId(partner != null ? partner.getId() : null)
                .partnerNickname(partner != null ? partner.getNickname() : null)
                .partnerProfileImage(partner != null ? partner.getProfileImage() : null)
                .status(req.getStatus().name())
                .lastMessage(lastMessage)
                .lastMessageTime(lastMessageTime)
                .unreadCount(unreadCount)
                .partnerPreferredLanguage(partnerLang)
                .build();
    }
}
