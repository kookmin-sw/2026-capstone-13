import api from './api';
import type { ApiResponse, PostCategory } from '../types';

export interface CommunityPostDto {
  id: number;
  category: PostCategory;
  title: string;
  content: string;
  images: string[];
  author: string;
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
