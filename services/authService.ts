// 인증 관련 API 호출 함수
import api from './api';
import type { ApiResponse, LoginRequest, LoginResponse, RegisterRequest, User } from '../types';

// 로그인
export const login = async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
  const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
  return response.data;
};

// 회원가입
export const register = async (data: RegisterRequest): Promise<ApiResponse<User>> => {
  const response = await api.post<ApiResponse<User>>('/auth/register', data);
  return response.data;
};

// 내 프로필 조회
export const getMyProfile = async (): Promise<ApiResponse<User>> => {
  const response = await api.get<ApiResponse<User>>('/auth/me');
  return response.data;
};
