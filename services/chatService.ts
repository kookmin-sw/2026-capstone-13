// 채팅 관련 API 및 WebSocket 서비스
import api from './api';
import type { ApiResponse } from '../types';

export interface ChatMessageDto {
  roomId: number;
  senderId: number;
  senderNickname: string;
  content: string;
  originalLanguage?: string;
  translatedContent?: string;
  createdAt: string;
}

// 채팅 이력 조회 (REST)
export const getChatMessages = async (roomId: number): Promise<ApiResponse<ChatMessageDto[]>> => {
  const response = await api.get<ApiResponse<ChatMessageDto[]>>(`/chat/rooms/${roomId}/messages`);
  return response.data;
};
