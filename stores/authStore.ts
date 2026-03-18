// 인증 상태 관리 (Zustand)
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types';
import { login as loginApi, register as registerApi, getMyProfile, uploadProfileImage, updateBio as updateBioApi, updateProfileDetail as updateProfileDetailApi } from '../services/authService';
import type { UpdateProfileRequest } from '../services/authService';
import type { LoginRequest, RegisterRequest } from '../types';

interface AuthState {
  // 상태
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isGuest: boolean;

  // 액션
  login: (data: LoginRequest) => Promise<boolean>;
  register: (data: RegisterRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  loginAsGuest: () => void;
  loginAsTestInternational: () => void;
  loginAsTestKorean: () => void;
  clearError: () => void;
  updateProfileImage: (imageUri: string) => Promise<boolean>;
  updateBio: (bio: string) => Promise<void>;
  updateProfileDetail: (data: UpdateProfileRequest) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,  // 앱 시작 시 loadUser 완료 전까지 true로 유지
  error: null,
  isGuest: false,

  // 로그인
  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await loginApi(data);
      if (response.success) {
        await SecureStore.setItemAsync('accessToken', response.data.accessToken);
        set({ user: response.data.user, isLoading: false });
        return true;
      } else {
        set({ error: response.message, isLoading: false });
        return false;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '로그인에 실패했습니다.';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // 회원가입
  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await registerApi(data);
      if (response.success) {
        set({ isLoading: false });
        return true;
      } else {
        set({ error: response.message, isLoading: false });
        return false;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '회원가입에 실패했습니다.';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // 로그아웃
  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    set({ user: null });
  },

  // 앱 시작 시 저장된 토큰으로 사용자 정보 로드
  loadUser: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const response = await getMyProfile();
      if (response.success) {
        set({ user: response.data, isLoading: false });
      } else {
        throw new Error(response.message);
      }
    } catch {
      await SecureStore.deleteItemAsync('accessToken');
      set({ isLoading: false });
    }
  },

  // 게스트로 둘러보기
  loginAsGuest: () => set({ isGuest: true, user: { id: 0, email: '', nickname: '게스트', userType: 'INTERNATIONAL', university: '', rating: 0, helpCount: 0, createdAt: '' } }),

  // 개발용 테스트 로그인
  loginAsTestInternational: () => set({ isGuest: false, user: { id: 1, email: 'international@test.com', nickname: '테스트유학생', userType: 'INTERNATIONAL', university: '국민대학교', rating: 0, helpCount: 0, createdAt: '' } }),
  loginAsTestKorean: () => set({ isGuest: false, user: { id: 2, email: 'korean@test.com', nickname: '테스트한국인', userType: 'KOREAN', university: '국민대학교', rating: 0, helpCount: 0, createdAt: '' } }),

  clearError: () => set({ error: null }),

  // 자기소개 수정 (로컬 즉시 반영 후 서버 동기화)
  updateBio: async (bio: string) => {
    set((state) => ({ user: state.user ? { ...state.user, bio } : null }));
    try {
      await updateBioApi(bio);
    } catch {
      // 서버 업로드 실패해도 로컬 표시는 유지
    }
  },

  // 프로필 상세 수정 (로컬 즉시 반영 후 서버 동기화)
  updateProfileDetail: async (data: UpdateProfileRequest) => {
    set((state) => ({ user: state.user ? { ...state.user, ...data } : null }));
    try {
      await updateProfileDetailApi(data);
    } catch {
      // 서버 업로드 실패해도 로컬 표시는 유지
    }
  },

  // 프로필 이미지 변경 (로컬 즉시 반영 후 서버 동기화)
  updateProfileImage: async (imageUri: string) => {
    // 선택한 이미지를 즉시 로컬에 반영
    set((state) => ({ user: state.user ? { ...state.user, profileImage: imageUri } : null }));
    try {
      await uploadProfileImage(imageUri);
    } catch {
      // 서버 업로드 실패해도 로컬 표시는 유지
    }
    return true;
  },
}));
