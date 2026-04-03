import api from './api';
import type { ApiResponse, PostCategory } from '../types';

export interface CommunityPostDto {
  id: number;
  category: PostCategory;
  title: string;
  content: string;
  images: string[];
  author: string;
  authorProfileImage?: string;
  university: string;
  userType: string;
  likes: number;
  comments: number;
  liked: boolean;
  createdAt: string;
}

export interface PostCommentDto {
  id: number;
  postId: number;
  author: string;
  authorProfileImage?: string;
  university: string;
  userType: string;
  content: string;
  createdAt: string;
}

export interface CommunityPostDetailDto extends CommunityPostDto {
  commentList: PostCommentDto[];
}

// 게시글 목록 조회
export const getCommunityPosts = async (): Promise<ApiResponse<CommunityPostDto[]>> => {
  const response = await api.get<ApiResponse<CommunityPostDto[]>>('/community');
  return response.data;
};

// 게시글 상세 조회 (댓글 포함)
export const getCommunityPost = async (id: number): Promise<ApiResponse<CommunityPostDetailDto>> => {
  const response = await api.get<ApiResponse<CommunityPostDetailDto>>(`/community/${id}`);
  return response.data;
};

// 게시글 작성
export const createCommunityPost = async (data: {
  category: PostCategory;
  title: string;
  content: string;
  images: string[];
}): Promise<ApiResponse<CommunityPostDto>> => {
  const response = await api.post<ApiResponse<CommunityPostDto>>('/community', data);
  return response.data;
};

// 댓글 작성
export const addCommunityComment = async (postId: number, content: string): Promise<ApiResponse<PostCommentDto>> => {
  const response = await api.post<ApiResponse<PostCommentDto>>(`/community/${postId}/comments`, { content });
  return response.data;
};

// 좋아요 토글
export const toggleCommunityLike = async (postId: number): Promise<ApiResponse<{ liked: boolean; likes: number }>> => {
  const response = await api.post<ApiResponse<{ liked: boolean; likes: number }>>(`/community/${postId}/like`);
  return response.data;
};

// 게시글 수정
export const updateCommunityPost = async (postId: number, data: {
  category: PostCategory;
  title: string;
  content: string;
  images: string[];
}): Promise<ApiResponse<CommunityPostDto>> => {
  const response = await api.put<ApiResponse<CommunityPostDto>>(`/community/${postId}`, data);
  return response.data;
};

// 게시글 삭제
export const deleteCommunityPost = async (postId: number): Promise<ApiResponse<null>> => {
  const response = await api.delete<ApiResponse<null>>(`/community/${postId}`);
  return response.data;
};

// 댓글 삭제
export const deleteCommunityComment = async (commentId: number): Promise<ApiResponse<null>> => {
  const response = await api.delete<ApiResponse<null>>(`/community/comments/${commentId}`);
  return response.data;
};

// 게시글 번역 (DB 캐시 → Gemini)
export const translateCommunityPost = async (
  postId: number,
  lang?: string,
): Promise<ApiResponse<{ title: string; content: string; langCode: string }>> => {
  const params = lang ? `?lang=${lang}` : '';
  const response = await api.get<ApiResponse<{ title: string; content: string; langCode: string }>>(
    `/community/${postId}/translate${params}`,
  );
  return response.data;
};
