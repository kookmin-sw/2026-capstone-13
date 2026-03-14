// 인증 상태 관리 (Zustand)
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types';
import { login as loginApi, register as registerApi, getMyProfile } from '../services/authService';
import type { LoginRequest, RegisterRequest } from '../types';

interface AuthState {
  // 상태
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;

  // 액션
  login: (data: LoginRequest) => Promise<boolean>;
  register: (data: RegisterRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,

  // 로그인
  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await loginApi(data);
      if (response.success) {
        await SecureStore.setItemAsync('accessToken', response.data.accessToken);
        set({
          user: response.data.user,
          isLoggedIn: true,
          isLoading: false,
        });
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
    set({ user: null, isLoggedIn: false });
  },

  // 앱 시작 시 저장된 토큰으로 사용자 정보 로드
  loadUser: async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) return;

    set({ isLoading: true });
    try {
      const response = await getMyProfile();
      if (response.success) {
        set({ user: response.data, isLoggedIn: true, isLoading: false });
      } else {
        await SecureStore.deleteItemAsync('accessToken');
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync('accessToken');
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
