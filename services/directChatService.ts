import api from './api';
import type { ApiResponse } from '../types';

export interface DirectChatRoomResponse {
  id: number;
  partnerId: number;
  partnerNickname: string;
  partnerProfileImage?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export interface DirectChatMessageDto {
  id?: number;
  roomId: number;
  senderId: number;
  senderNickname: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
}

export const getOrCreateDirectRoom = async (targetUserId: number): Promise<ApiResponse<DirectChatRoomResponse>> => {
  const res = await api.post<ApiResponse<DirectChatRoomResponse>>('/direct-chat/rooms', { targetUserId });
  return res.data;
};

export const getDirectChatRooms = async (): Promise<ApiResponse<DirectChatRoomResponse[]>> => {
  const res = await api.get<ApiResponse<DirectChatRoomResponse[]>>('/direct-chat/rooms');
  return res.data;
};

export const getDirectMessages = async (roomId: number): Promise<ApiResponse<DirectChatMessageDto[]>> => {
  const res = await api.get<ApiResponse<DirectChatMessageDto[]>>(`/direct-chat/rooms/${roomId}/messages`);
  return res.data;
};

export const markDirectAsRead = async (roomId: number): Promise<void> => {
  await api.patch(`/direct-chat/rooms/${roomId}/read`);
};

export const leaveDirectRoom = async (roomId: number): Promise<void> => {
  await api.post(`/direct-chat/rooms/${roomId}/leave`);
};
