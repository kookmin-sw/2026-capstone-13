package com.helpboys.api.service;

import com.cloudinary.Cloudinary;
import com.helpboys.api.dto.LoginRequest;
import com.helpboys.api.dto.LoginResponse;
import com.helpboys.api.dto.RegisterRequest;
import com.helpboys.api.dto.UserResponse;
import com.helpboys.api.entity.User;
import com.helpboys.api.exception.BusinessException;
import com.helpboys.api.repository.UserRepository;
import com.helpboys.api.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final Cloudinary cloudinary;

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
        // 이메일 중복 확인
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("이미 사용 중인 이메일입니다.");
        }

        // 이메일 인증 완료 여부 확인
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
                .emailVerified(true)
                .studentIdImageUrl(request.getStudentIdImageUrl())
                .studentIdStatus(User.StudentIdStatus.PENDING)
                .build();

        UserResponse response = UserResponse.from(userRepository.save(user));

        // 이메일 인증 정보 정리
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

        // 학생증 인증 상태 확인
        if (user.getStudentIdStatus() == User.StudentIdStatus.PENDING) {
            throw new BusinessException("학생증 검토 중입니다. 승인 후 로그인 가능합니다.", HttpStatus.FORBIDDEN);
        }
        if (user.getStudentIdStatus() == User.StudentIdStatus.REJECTED) {
            throw new BusinessException("학생증 인증이 거절되었습니다. 고객센터에 문의해주세요.", HttpStatus.FORBIDDEN);
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getId());
        return LoginResponse.builder()
                .accessToken(token)
                .user(UserResponse.from(user))
                .build();
    }

    // 학생증 이미지 Cloudinary 업로드
    public String uploadStudentIdImage(MultipartFile file) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    Map.of("folder", "student-ids")
            );
            return (String) result.get("secure_url");
        } catch (IOException e) {
            throw new BusinessException("이미지 업로드에 실패했습니다.");
        }
    }

    // 사용자 조회 (이메일)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
    }

    // 사용자 조회 (ID)
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        return UserResponse.from(user);
    }

    // 학생증 검토 대기 목록 조회 (관리자용)
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
        user.setStudentIdStatus(User.StudentIdStatus.APPROVED);
        userRepository.save(user);
    }

    // 학생증 거절 (관리자용)
    @Transactional
    public void rejectStudentId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        user.setStudentIdStatus(User.StudentIdStatus.REJECTED);
        userRepository.save(user);
    }

    // 자기소개 수정
    @Transactional
    public UserResponse updateBio(Long userId, String bio) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        user.setBio(bio);
        return UserResponse.from(userRepository.save(user));
    }

    // 프로필 상세 수정 (bio, gender, age, major, mbti, hobbies)
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

    // FCM 토큰 저장 (앱 로그인/포그라운드 진입 시 호출)
    @Transactional
    public void updateFcmToken(Long userId, String fcmToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        user.setFcmToken(fcmToken);
        userRepository.save(user);
    }
}