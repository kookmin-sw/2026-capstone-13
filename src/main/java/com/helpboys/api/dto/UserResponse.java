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
    private Integer ratingCount;
    private Integer helpCount;
    private String createdAt;
    private String preferredLanguage;
    private String nationality;
    private boolean emailVerified;
    private boolean studentIdVerified;
    private String studentIdStatus;

    // 타인 프로필 조회용 (이메일 제외)
    public static UserResponse fromPublic(User user) {
        return UserResponse.builder()
                .id(user.getId())
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
                .ratingCount(user.getRatingCount())
                .helpCount(user.getHelpCount())
                .createdAt(user.getCreatedAt().toString())
                .preferredLanguage(user.getPreferredLanguage())
                .nationality(user.getNationality())
                .studentIdVerified(user.isStudentIdVerified())
                .studentIdStatus(user.getStudentIdStatus().name())
                .build();
    }

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
                .ratingCount(user.getRatingCount())
                .helpCount(user.getHelpCount())
                .createdAt(user.getCreatedAt().toString())
                .preferredLanguage(user.getPreferredLanguage())
                .nationality(user.getNationality())
                .emailVerified(user.isEmailVerified())
                .studentIdVerified(user.isStudentIdVerified())
                .studentIdStatus(user.getStudentIdStatus().name())
                .build();
    }
}
