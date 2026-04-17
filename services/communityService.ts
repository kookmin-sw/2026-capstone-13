import * as SecureStore from 'expo-secure-store';
import api from './api';
import type { ApiResponse, PostCategory } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-0a6f.up.railway.app/api';

export interface CommunityPostDto {
  id: number;
  category: PostCategory;
  title: string;
  content: string;
  images: string[];
  authorId?: number;
  author: string;
  authorProfileImage?: string;
  university: string;
  userType: string;
  authorNationality?: string;
  likes: number;
  comments: number;
  commentList: PostCommentDto[];
  liked: boolean;
  createdAt: string;
}

export interface PostCommentDto {
  id: number;
  postId: number;
  parentCommentId?: number;
  authorId?: number;
  author: string;
  authorProfileImage?: string;
  university: string;
  userType: string;
  content: string;
  createdAt: string;
  replyCount?: number;
}

export interface CommunityPostDetailDto extends CommunityPostDto {
  commentList: PostCommentDto[];
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  last: boolean;
  first: boolean;
}

// 게시글 이미지 업로드 (Cloudinary) - fetch 사용으로 multipart boundary 자동 처리
export const uploadCommunityImage = async (uri: string): Promise<string> => {
  const token = await SecureStore.getItemAsync('accessToken');
  const rawName = uri.split('/').pop() ?? 'image.jpg';
  const match = /\.(\w+)$/.exec(rawName);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const filename = match ? rawName : `image_${Date.now()}.jpg`;

  const formData = new FormData();
  formData.append('file', { uri, name: filename, type } as unknown as Blob);

  const response = await fetch(`${BASE_URL}/community/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) throw new Error('이미지 업로드 실패');
  const json = await response.json();
  return json.data.url;
};

// 게시글 목록 조회
export const getCommunityPosts = async (): Promise<ApiResponse<PagedResponse<CommunityPostDto>>> => {
  const response = await api.get<ApiResponse<PagedResponse<CommunityPostDto>>>('/community');
  return response.data;
};

// 특정 유저의 커뮤니티 게시글 목록
export const getUserCommunityPosts = async (userId: number): Promise<ApiResponse<CommunityPostDto[]>> => {
  const response = await api.get<ApiResponse<CommunityPostDto[]>>(`/community/user/${userId}`);
  const content: CommunityPostDto[] = response.data.data?.content ?? response.data.data ?? [];
  return { ...response.data, data: content };
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

// 대댓글 조회
export const getCommunityReplies = async (commentId: number): Promise<ApiResponse<PostCommentDto[]>> => {
  const response = await api.get<ApiResponse<PostCommentDto[]>>(`/community/comments/${commentId}/replies`);
  return response.data;
};

// 대댓글 작성
export const addCommunityReply = async (commentId: number, content: string): Promise<ApiResponse<PostCommentDto>> => {
  const response = await api.post<ApiResponse<PostCommentDto>>(`/community/comments/${commentId}/replies`, { content });
  return response.data;
};

// 댓글 번역
export const translateCommunityComment = async (
  commentId: number,
  lang?: string,
): Promise<ApiResponse<{ content: string; langCode: string }>> => {
  const params = lang ? `?lang=${lang}` : '';
  const response = await api.get<ApiResponse<{ content: string; langCode: string }>>(
    `/community/comments/${commentId}/translate${params}`,
    { timeout: 35000 },
  );
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
    { timeout: 35000 },
  );
  return response.data;
};
