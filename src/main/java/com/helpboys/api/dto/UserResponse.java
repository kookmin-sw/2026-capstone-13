package com.helpboys.api.dto;

import com.helpboys.api.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

// User Entity → 응답 DTO 변환용
@Getter
@AllArgsConstructor
@Builder
public class UserResponse {
    private Long id;
    private String email;
    private String nickname;
    private String userType;
    private String university;
    private String profileImage;
    private String bio;
    private String gender;
    private String age;
    private String major;
    private String mbti;
    private String hobbies;
    private Double rating;
    private Integer helpCount;
    private String createdAt;
    private String preferredLanguage;
    private String studentIdStatus;
    private boolean emailVerified;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .userType(user.getUserType().name())
                .university(user.getUniversity())
                .profileImage(user.getProfileImage())
                .bio(user.getBio())
                .gender(user.getGender())
                .age(user.getAge())
                .major(user.getMajor())
                .mbti(user.getMbti())
                .hobbies(user.getHobbies())
                .rating(user.getRating())
                .helpCount(user.getHelpCount())
                .createdAt(user.getCreatedAt().toString())
                .preferredLanguage(user.getPreferredLanguage())
                .studentIdStatus(user.getStudentIdStatus().name())
                .emailVerified(user.isEmailVerified())
                .build();
    }
}
