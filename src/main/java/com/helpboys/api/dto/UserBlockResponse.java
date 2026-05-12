package com.helpboys.api.dto;

import com.helpboys.api.entity.UserBlock;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class UserBlockResponse {

    private Long id;
    private UserResponse blockedUser;
    private String createdAt;

    public static UserBlockResponse from(UserBlock block) {
        return UserBlockResponse.builder()
                .id(block.getId())
                .blockedUser(UserResponse.from(block.getBlocked()))
                .createdAt(block.getCreatedAt().toString())
                .build();
    }
}