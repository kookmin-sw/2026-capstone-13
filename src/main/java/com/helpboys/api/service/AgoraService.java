package com.helpboys.api.service;

import com.helpboys.api.dto.AgoraTokenResponse;
import com.helpboys.api.util.AgoraTokenUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AgoraService {

    @Value("${agora.app-id}")
    private String appId;

    @Value("${agora.app-certificate}")
    private String appCertificate;

    private static final int TOKEN_EXPIRE_SECONDS = 3600; // 1시간

    public AgoraTokenResponse generateToken(String channelName, Long userId) {
        int uid = 0; // uid=0이면 어떤 UID로든 채널 입장 가능
        try {
            String token = AgoraTokenUtil.buildRtcToken(appId, appCertificate, channelName, uid, TOKEN_EXPIRE_SECONDS);
            return new AgoraTokenResponse(token, channelName, uid);
        } catch (Exception e) {
            throw new RuntimeException("Agora 토큰 생성 실패: " + e.getMessage());
        }
    }
}
