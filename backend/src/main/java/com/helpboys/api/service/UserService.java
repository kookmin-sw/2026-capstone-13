package com.helpboys.api.service;

import com.cloudinary.Cloudinary;
import com.helpboys.api.dto.LoginRequest;
import com.helpboys.api.dto.LoginResponse;
import com.helpboys.api.dto.PasswordChangeRequest;
import com.helpboys.api.dto.RegisterRequest;
import com.helpboys.api.dto.UserResponse;
import com.helpboys.api.entity.Notification;
import com.helpboys.api.entity.User;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.UserBlockRepository;
import com.helpboys.api.repository.UserRepository;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final Cloudinary cloudinary;
    private final NotificationService notificationService;

    // Spring Security UserDetailsService 구현
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + email));
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                Collections.emptyList()
        );
    }

    // 회원가입 (이메일 인증 완료 + 학생증 이미지 필요)
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (!request.getEmail().endsWith("@kookmin.ac.kr") && !request.getEmail().endsWith(".kookmin.ac.kr")) {
            throw new BusinessException("국민대학교 이메일(@kookmin.ac.kr)만 허용됩니다.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("이미 사용 중인 이메일입니다.");
        }
        if (!emailService.isVerified(request.getEmail())) {
            throw new BusinessException("이메일 인증을 완료해주세요.");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .userType(request.getUserType())
                .university(request.getUniversity())
                .major(request.getMajor())
                .nationality(request.getNationality())
                .emailVerified(true)
                .studentIdImageUrl(request.getStudentIdImageUrl())
                .studentIdStatus(User.StudentIdStatus.PENDING)
                .termsAgreedAt(LocalDateTime.now())
                .privacyAgreedAt(LocalDateTime.now())
                .build();

        UserResponse response = UserResponse.from(userRepository.save(user));
        emailService.deleteVerification(request.getEmail());
        return response;
    }

    // 로그인 (학생증 승인 여부 확인)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("이메일 또는 비밀번호가 올바르지 않습니다.", HttpStatus.UNAUTHORIZED));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException("이메일 또는 비밀번호가 올바르지 않습니다.", HttpStatus.UNAUTHORIZED);
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getId());
        return LoginResponse.builder()
                .accessToken(token)
                .user(UserResponse.from(user))
                .build();
    }

    public long getTodayActiveHelperCount() {
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        return userRepository.countActiveKoreanHelpers(startOfDay);
    }

    // 이미지 Cloudinary 업로드 (공통)
    public String uploadImage(MultipartFile file, String folder) {
        validateImageFile(file);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    Map.of("folder", folder)
            );
            return (String) result.get("secure_url");
        } catch (IOException e) {
            throw new BusinessException("이미지 업로드에 실패했습니다.");
        }
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("파일이 없습니다.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BusinessException("이미지 파일만 업로드할 수 있습니다. (jpg, png, gif 등)");
        }
    }

    // 학생증 이미지 Cloudinary 업로드
    public String uploadStudentIdImage(MultipartFile file) {
        return uploadImage(file, "student-ids");
    }

    // 학생증 URL 저장 (심사 대기 상태로)
    @Transactional
    public void uploadStudentId(Long userId, String imageUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        user.setStudentIdImageUrl(imageUrl);
        user.setStudentIdStatus(User.StudentIdStatus.PENDING);
        userRepository.save(user);
    }

    // 학생증 검토 대기 목록 (관리자용)
    public List<UserResponse> getPendingStudentIds() {
        return userRepository.findByStudentIdStatus(User.StudentIdStatus.PENDING)
                .stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    // 학생증 승인 (관리자용)
    @Transactional
    public void approveStudentId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        user.setStudentIdVerified(true);
        user.setStudentIdStatus(User.StudentIdStatus.APPROVED);
        deleteCloudinaryImage(user.getStudentIdImageUrl());
        user.setStudentIdImageUrl(null);
        userRepository.save(user);

        boolean approvedUserIsKo = "ko".equals(user.getPreferredLanguage());
        notificationService.createNotification(
                userId,
                Notification.NotificationType.STUDENT_ID_APPROVED,
                approvedUserIsKo
                        ? "학생증 인증이 승인되었습니다. 이제 모든 서비스를 이용할 수 있어요!"
                        : "Your student ID has been approved. You can now use all services!",
                null,
                Notification.ReferenceType.NONE
        );
    }

    // 학생증 거절 (관리자용)
    @Transactional
    public void rejectStudentId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        user.setStudentIdVerified(false);
        user.setStudentIdStatus(User.StudentIdStatus.REJECTED);
        deleteCloudinaryImage(user.getStudentIdImageUrl());
        user.setStudentIdImageUrl(null);
        userRepository.save(user);

        boolean rejectedUserIsKo = "ko".equals(user.getPreferredLanguage());
        notificationService.createNotification(
                userId,
                Notification.NotificationType.STUDENT_ID_REJECTED,
                rejectedUserIsKo
                        ? "학생증 인증이 거절되었습니다. 학생증 사진을 다시 제출해주세요."
                        : "Your student ID was rejected. Please resubmit your student ID photo.",
                null,
                Notification.ReferenceType.NONE
        );
    }

    // Cloudinary 이미지 삭제 (URL에서 public_id 추출)
    private void deleteCloudinaryImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return;
        try {
            String publicId = imageUrl.substring(imageUrl.indexOf("/upload/") + 8);
            if (publicId.matches("v\\d+/.*")) {
                publicId = publicId.substring(publicId.indexOf('/') + 1);
            }
            publicId = publicId.substring(0, publicId.lastIndexOf('.'));
            cloudinary.uploader().destroy(publicId, Map.of());
        } catch (Exception e) {
            log.warn("[Cloudinary] 이미지 삭제 실패: {}", e.getMessage());
        }
    }

    // 어드민 권한 확인
    public void checkAdmin(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        if (!user.isAdmin()) {
            throw new BusinessException("관리자 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
    }

    // 이메일로 사용자 조회 (관리자 체크용)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    // 이메일로 관리자 권한 확인
    public void checkAdminByEmail(String email) {
        User user = getUserByEmail(email);
        if (!user.isAdmin()) {
            throw new BusinessException("관리자 권한이 없습니다.", HttpStatus.FORBIDDEN);
        }
    }

    // 사용자 선호 언어 조회 (없으면 "en" 반환)
    public String getUserPreferredLanguage(Long userId) {
        return userRepository.findById(userId)
                .map(u -> u.getPreferredLanguage() != null ? u.getPreferredLanguage() : "en")
                .orElse("en");
    }

    // 사용자 공개 프로필 조회 (이메일 제외)
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        return UserResponse.fromPublic(user);
    }

    // 한국인 유저 목록 조회 (차단 유저 제외)
    public List<UserResponse> getKoreanUsers(Long userId) {
        List<Long> blockedIds = userBlockRepository.findBlockedIdsByBlockerId(userId);
        List<Long> excludedIds = blockedIds.isEmpty() ? List.of(-1L) : blockedIds;
        return userRepository.findByUserTypeExcluding(User.UserType.KOREAN, excludedIds)
                .stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    // 자기소개 수정
    @Transactional
    public UserResponse updateBio(Long userId, String bio) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        user.setBio(bio);
        return UserResponse.from(userRepository.save(user));
    }

    // 프로필 상세 수정
    @Transactional
    public UserResponse updateProfile(Long userId, Map<String, String> body) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        if (body.containsKey("bio")) user.setBio(body.get("bio"));
        if (body.containsKey("gender")) user.setGender(body.get("gender"));
        if (body.containsKey("age")) user.setAge(body.get("age"));
        if (body.containsKey("major")) user.setMajor(body.get("major"));
        if (body.containsKey("mbti")) user.setMbti(body.get("mbti"));
        if (body.containsKey("hobbies")) user.setHobbies(body.get("hobbies"));
        if (body.containsKey("profileImage")) user.setProfileImage(body.get("profileImage"));
        if (body.containsKey("preferredLanguage")) user.setPreferredLanguage(body.get("preferredLanguage"));
        user.setProfileSetup(true);
        return UserResponse.from(userRepository.save(user));
    }

    // 프로필 이미지 URL 저장
    @Transactional
    public UserResponse updateProfileImage(Long userId, String imageUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        user.setProfileImage(imageUrl);
        return UserResponse.from(userRepository.save(user));
    }

    // FCM 토큰 저장
    @Transactional
    public void updateFcmToken(Long userId, String fcmToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        user.setFcmToken(fcmToken);
        userRepository.save(user);
    }

    // 비밀번호 변경
    @Transactional
    public void changePassword(Long userId, PasswordChangeRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BusinessException("현재 비밀번호가 올바르지 않습니다.", HttpStatus.BAD_REQUEST);
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    // 비밀번호 재설정 (이메일 인증 완료 후)
    @Transactional
    public void resetPassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("가입된 계정이 없습니다.", HttpStatus.NOT_FOUND));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    // 회원 탈퇴 (소프트 삭제 + 개인정보 익명화)
    @Transactional
    public void deleteAccount(Long userId, String password) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BusinessException("비밀번호가 올바르지 않습니다.", HttpStatus.BAD_REQUEST);
        }
        deleteCloudinaryImage(user.getProfileImage());
        deleteCloudinaryImage(user.getStudentIdImageUrl());
        user.setDeleted(true);
        user.setEmail("deleted_" + userId + "@deleted.com");
        user.setNickname("(알 수 없음)");
        user.setProfileImage(null);
        user.setBio(null);
        user.setFcmToken(null);
        user.setStudentIdImageUrl(null);
        userRepository.save(user);
    }
}