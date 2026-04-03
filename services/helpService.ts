// 도움 요청 관련 API 호출 함수
import api from './api';
import type { ApiResponse, HelpRequest, HelpCategory, HelpMethod } from '../types';

const SERVER_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-0a6f.up.railway.app/api').replace('/api', '');

function toAbsoluteUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url.startsWith('content://')) return url;
  return SERVER_BASE_URL + url;
}

function normalizeHelpRequest(req: HelpRequest): HelpRequest {
  return {
    ...req,
    requester: { ...req.requester, profileImage: toAbsoluteUrl(req.requester.profileImage) },
    helper: req.helper ? { ...req.helper, profileImage: toAbsoluteUrl(req.helper.profileImage) } : req.helper,
  };
}

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
  return { ...response.data, data: response.data.data.map(normalizeHelpRequest) };
};

// 도움 요청 상세 조회
export const getHelpRequestById = async (id: number): Promise<ApiResponse<HelpRequest>> => {
  const response = await api.get<ApiResponse<HelpRequest>>(`/requests/${id}`);
  return { ...response.data, data: normalizeHelpRequest(response.data.data) };
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

// 도움 요청 수정
export const updateHelpRequest = async (id: number, data: CreateHelpRequest): Promise<ApiResponse<HelpRequest>> => {
  const response = await api.put<ApiResponse<HelpRequest>>(`/requests/${id}`, data);
  return response.data;
};

// 도움 요청 삭제 (CANCELLED 상태로 변경)
export const cancelHelpRequest = async (id: number): Promise<ApiResponse<HelpRequest>> => {
  const response = await api.patch<ApiResponse<HelpRequest>>(`/requests/${id}/status`, null, {
    params: { status: 'CANCELLED' },
  });
  return response.data;
};

// 도움 신청 거절 (외국인 학생이 helper 거절 → WAITING 복귀)
export const rejectHelper = async (id: number): Promise<ApiResponse<HelpRequest>> => {
  const response = await api.post<ApiResponse<HelpRequest>>(`/requests/${id}/reject`);
  return response.data;
};

// 도움 진행 시작 (외국인 수락 → IN_PROGRESS)
export const startHelpRequest = async (id: number): Promise<ApiResponse<HelpRequest>> => {
  const response = await api.patch<ApiResponse<HelpRequest>>(`/requests/${id}/status`, null, {
    params: { status: 'IN_PROGRESS' },
  });
  return response.data;
};

// 채팅방 나가기 - 상태를 WAITING으로 리셋 (기존 배포 엔드포인트 사용)
export const resetToWaiting = async (id: number): Promise<ApiResponse<HelpRequest>> => {
  const response = await api.patch<ApiResponse<HelpRequest>>(`/requests/${id}/status`, null, {
    params: { status: 'WAITING' },
  });
  return response.data;
};

// 내가 등록한 도움 요청 목록
export const getMyRequests = async (): Promise<ApiResponse<HelpRequest[]>> => {
  const response = await api.get<ApiResponse<HelpRequest[]>>('/requests/my');
  return response.data;
};

// 내가 도움을 준 요청 목록
export const getHelpedRequests = async (): Promise<ApiResponse<HelpRequest[]>> => {
  const response = await api.get<ApiResponse<HelpRequest[]>>('/requests/helped');
  return response.data;
};
