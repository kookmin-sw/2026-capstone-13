import api from './api';

export interface ReviewRequest {
  rating: number;
  comment?: string;
}

export interface ReviewResponse {
  id: number;
  helpRequestId: number;
  reviewer: { id: number; nickname: string; profileImage?: string };
  reviewee: { id: number; nickname: string; profileImage?: string };
  rating: number;
  comment?: string;
  createdAt: string;
}

export const createReview = async (helpRequestId: number, data: ReviewRequest): Promise<void> => {
  await api.post(`/reviews/${helpRequestId}`, data);
};

export const hasReviewed = async (helpRequestId: number): Promise<boolean> => {
  const res = await api.get(`/reviews/${helpRequestId}/status`);
  return res.data.data?.reviewed ?? false;
};
