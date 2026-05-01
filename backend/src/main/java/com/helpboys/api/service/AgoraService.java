package com.helpboys.api.service;

import com.helpboys.api.dto.AgoraTokenResponse;
import io.agora.media.AccessToken2;
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
        try {
            AccessToken2 accessToken = new AccessToken2(appId, appCertificate, TOKEN_EXPIRE_SECONDS);
            AccessToken2.ServiceRtc serviceRtc = new AccessToken2.ServiceRtc(channelName, "");

            serviceRtc.addPrivilegeRtc(AccessToken2.PrivilegeRtc.PRIVILEGE_JOIN_CHANNEL, TOKEN_EXPIRE_SECONDS);
            serviceRtc.addPrivilegeRtc(AccessToken2.PrivilegeRtc.PRIVILEGE_PUBLISH_AUDIO_STREAM, TOKEN_EXPIRE_SECONDS);
            serviceRtc.addPrivilegeRtc(AccessToken2.PrivilegeRtc.PRIVILEGE_PUBLISH_VIDEO_STREAM, TOKEN_EXPIRE_SECONDS);
            serviceRtc.addPrivilegeRtc(AccessToken2.PrivilegeRtc.PRIVILEGE_PUBLISH_DATA_STREAM, TOKEN_EXPIRE_SECONDS);
            accessToken.addService(serviceRtc);

            String token = accessToken.build();
            return new AgoraTokenResponse(token, channelName, 0);
        } catch (Exception e) {
            throw new RuntimeException("Agora 토큰 생성 실패: " + e.getMessage());
        }
    }
}
