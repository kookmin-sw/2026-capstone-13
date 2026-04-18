package com.helpboys.api.dto;

import com.helpboys.api.entity.DirectChatRoom;
import com.helpboys.api.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class DirectChatRoomResponse {

    private Long id;
    private Long partnerId;
    private String partnerNickname;
    private String partnerProfileImage;
    private String lastMessage;
    private String lastMessageTime;
    private long unreadCount;

    public static DirectChatRoomResponse from(DirectChatRoom room, Long myUserId,
                                               String lastMessage, String lastMessageTime,
                                               long unreadCount) {
        User partner = room.getUser1().getId().equals(myUserId)
                ? room.getUser2()
                : room.getUser1();

        return DirectChatRoomResponse.builder()
                .id(room.getId())
                .partnerId(partner.getId())
                .partnerNickname(partner.getNickname())
                .partnerProfileImage(partner.getProfileImage())
                .lastMessage(lastMessage)
                .lastMessageTime(lastMessageTime)
                .unreadCount(unreadCount)
                .build();
    }
}
