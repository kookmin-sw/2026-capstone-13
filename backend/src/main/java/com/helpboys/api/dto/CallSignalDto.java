package com.helpboys.api.dto;

import lombok.*;

/**
 * WebRTC 시그널링 메시지 DTO
 *
 * type 종류:
 *  - call-invite    : 발신자 → 수신자 (전화 요청 알림)
 *  - call-accepted  : 수신자 → 발신자 (수락)
 *  - call-rejected  : 수신자 → 발신자 (거절)
 *  - offer          : 발신자 → 수신자 (SDP offer)
 *  - answer         : 수신자 → 발신자 (SDP answer)
 *  - ice-candidate  : 양방향 (ICE 후보 교환)
 *  - call-end       : 양방향 (통화 종료)
 *  - subtitle       : 번역된 자막 텍스트 relay
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallSignalDto {

    // 시그널 타입
    private String type;

    // 보내는 사람 userId
    private Long fromUserId;

    // 받는 사람 userId
    private Long toUserId;

    // 채팅방(help_request) ID — 통화 컨텍스트 식별용
    private Long roomId;

    // 발신자 닉네임 (call-invite 시 수신자 화면에 표시)
    private String callerNickname;

    // SDP (offer / answer 시 사용)
    private String sdp;

    // ICE candidate (ice-candidate 시 사용)
    private String candidate;
    private String sdpMid;
    private Integer sdpMLineIndex;

    // 번역 자막 (subtitle 시 사용)
    private String subtitleText;
}