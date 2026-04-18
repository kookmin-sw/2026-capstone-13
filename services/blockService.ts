import api from './api';
import type { ApiResponse } from '../types';

export interface UserBlockItem {
  id: number;
  blockedUser: {
    id: number;
    nickname: string;
    profileImage: string | null;
    userType: string;
    nationality: string | null;
  };
  createdAt: string;
}

export const blockUser = async (userId: number): Promise<ApiResponse<null>> => {
  const response = await api.post<ApiResponse<null>>(`/users/${userId}/block`);
  return response.data;
};

export const unblockUser = async (userId: number): Promise<ApiResponse<null>> => {
  const response = await api.delete<ApiResponse<null>>(`/users/${userId}/block`);
  return response.data;
};

export const getBlockedUsers = async (): Promise<ApiResponse<UserBlockItem[]>> => {
  const response = await api.get<ApiResponse<UserBlockItem[]>>('/users/blocked');
  return response.data;
};

export const getBlockStatus = async (userId: number): Promise<ApiResponse<{ isBlocked: boolean }>> => {
  const response = await api.get<ApiResponse<{ isBlocked: boolean }>>(`/users/${userId}/block-status`);
  return response.data;
};
