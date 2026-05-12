package com.helpboys.api.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AgoraTokenResponse {
    private String token;
    private String channelName;
    private int uid;
}
