import api from './api';
import type { ApiResponse } from '../types';

export type ReportTargetType = 'USER' | 'POST' | 'HELP_REQUEST';

export interface ReportRequest {
  targetUserId: number;
  targetType: ReportTargetType;
  targetId?: number;
  reason: string;
}

export const reportContent = async (data: ReportRequest): Promise<ApiResponse<null>> => {
  const response = await api.post<ApiResponse<null>>('/reports', data);
  return response.data;
};
