// 도움 요청 관련 API 호출 함수
import api from './api';
import type { ApiResponse, HelpRequest, HelpCategory, HelpMethod } from '../types';

// 도움 요청 등록
export interface CreateHelpRequest {
  title: string;
  description: string;
  category: HelpCategory;
  helpMethod: HelpMethod;
}

export const createHelpRequest = async (data: CreateHelpRequest): Promise<ApiResponse<HelpRequest>> => {
  const response = await api.post<ApiResponse<HelpRequest>>('/requests', data);
  return response.data;
};

// 도움 요청 목록 조회
export const getHelpRequests = async (): Promise<ApiResponse<HelpRequest[]>> => {
  const response = await api.get<ApiResponse<HelpRequest[]>>('/requests');
  return response.data;
};

// 도움 요청 상세 조회
export const getHelpRequestById = async (id: number): Promise<ApiResponse<HelpRequest>> => {
  const response = await api.get<ApiResponse<HelpRequest>>(`/requests/${id}`);
  return response.data;
};

// 도움 요청에 참여 (한국인 학생이 도움을 주겠다고 신청)
export const acceptHelpRequest = async (id: number): Promise<ApiResponse<HelpRequest>> => {
  const response = await api.post<ApiResponse<HelpRequest>>(`/requests/${id}/accept`);
  return response.data;
};

// 도움 완료 처리
export const completeHelpRequest = async (id: number): Promise<ApiResponse<HelpRequest>> => {
  const response = await api.patch<ApiResponse<HelpRequest>>(`/requests/${id}/status`, null, {
    params: { status: 'COMPLETED' },
  });
  return response.data;
};

// 도움 요청 취소 (삭제 대용)
export const cancelHelpRequest = async (id: number): Promise<ApiResponse<HelpRequest>> => {
  const response = await api.patch<ApiResponse<HelpRequest>>(`/requests/${id}/status`, null, {
    params: { status: 'CANCELLED' },
  });
  return response.data;
};
