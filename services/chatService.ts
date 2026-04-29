// 채팅 관련 API 및 WebSocket 서비스
import api from './api';
import type { ApiResponse } from '../types';

export interface ChatMessageDto {
  id?: number;
  roomId: number;
  senderId: number;
  senderNickname: string;
  content: string;
  isRead?: boolean;
  originalLanguage?: string;
  translatedContent?: string;
  culturalNote?: string;
  createdAt: string;
}

export interface ChatRoomResponse {
  id: number;
  title: string;
  partnerId: number;
  partnerNickname: string;
  partnerProfileImage?: string;
  status: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
}

// 내 채팅방 목록 조회 (마지막 메시지 포함)
export const getChatRooms = async (): Promise<ApiResponse<ChatRoomResponse[]>> => {
  const response = await api.get<ApiResponse<ChatRoomResponse[]>>('/chat/rooms');
  return response.data;
};

// 채팅 이력 조회 (REST)
export const getChatMessages = async (roomId: number): Promise<ApiResponse<ChatMessageDto[]>> => {
  const response = await api.get<ApiResponse<ChatMessageDto[]>>(`/chat/rooms/${roomId}/messages`);
  return response.data;
};

// 음성 메시지 전송 (REST) - 오디오 파일 → 텍스트 변환 후 채팅 저장
export const sendVoiceMessage = async (roomId: number, audioUri: string): Promise<ApiResponse<ChatMessageDto>> => {
  const formData = new FormData();
  formData.append('audio', {
    uri: audioUri,
    name: 'voice.wav',
    type: 'audio/wav',
  } as unknown as Blob);

  const response = await api.post<ApiResponse<ChatMessageDto>>(
    `/chat/rooms/${roomId}/voice-message`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

// 채팅 메시지 온디맨드 번역 (translatedContent 없는 경우)
export const translateChatMessage = async (messageId: number): Promise<ApiResponse<ChatMessageDto>> => {
  const response = await api.post<ApiResponse<ChatMessageDto>>(`/chat/messages/${messageId}/translate`, undefined, { timeout: 35000 });
  return response.data;
};
