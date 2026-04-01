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
  const response = await api.get<ApiResponse<User>>('/users/me');
  return response.data;
};

// 자기소개 수정
export const updateBio = async (bio: string): Promise<ApiResponse<User>> => {
  const response = await api.patch<ApiResponse<User>>('/users/bio', { bio });
  return response.data;
};

// 프로필 상세 수정 (bio, gender, age, major, mbti, hobbies)
export interface UpdateProfileRequest {
  bio?: string;
  gender?: string;
  age?: string;
  major?: string;
  mbti?: string;
  hobbies?: string;
  preferredLanguage?: string;
}

export const updateProfileDetail = async (data: UpdateProfileRequest): Promise<ApiResponse<User>> => {
  const response = await api.patch<ApiResponse<User>>('/users/profile', data);
  return response.data;
};

// 프로필 이미지 업로드
export const uploadProfileImage = async (imageUri: string): Promise<ApiResponse<User>> => {
  const formData = new FormData();
  const fileName = imageUri.split('/').pop() ?? 'profile.jpg';
  const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
  formData.append('image', { uri: imageUri, name: fileName, type: fileType } as unknown as Blob);

  const response = await api.post<ApiResponse<User>>('/users/profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
