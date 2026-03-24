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
  culturalNote?: string;
  createdAt: string;
}

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
