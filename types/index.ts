// 앱 전체에서 사용하는 타입 정의

// 사용자 유형
export type UserType = 'INTERNATIONAL' | 'EXCHANGE' | 'KOREAN';

// 도움 카테고리
export type HelpCategory = 'BANK' | 'HOSPITAL' | 'SCHOOL' | 'DAILY' | 'OTHER';

// 도움 방식
export type HelpMethod = 'CHAT' | 'VIDEO_CALL' | 'OFFLINE';

// 도움 요청 상태
export type RequestStatus = 'WAITING' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// 사용자 정보
export interface User {
  id: number;
  email: string;
  nickname: string;
  userType: UserType;
  university: string;
  profileImage?: string;
  bio?: string;
  gender?: string;
  age?: string;
  major?: string;
  mbti?: string;
  hobbies?: string;
  rating: number;
  helpCount: number;
  createdAt: string;
  preferredLanguage?: string;
  emailVerified?: boolean;
  studentIdVerified?: boolean;
  studentIdStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

// 로그인 요청
export interface LoginRequest {
  email: string;
  password: string;
}

// 회원가입 요청
export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
  userType: UserType;
  university: string;
  major?: string;
}

// 도움 요청 게시글
export interface HelpRequest {
  id: number;
  title: string;
  description: string;
  category: HelpCategory;
  helpMethod: HelpMethod;
  status: RequestStatus;
  requester: User;
  helper?: User;
  createdAt: string;
  updatedAt: string;
}

// 채팅 메시지
export interface ChatMessage {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  translatedContent?: string;
  createdAt: string;
}

// 채팅방
export interface ChatRoom {
  id: number;
  helpRequestId: number;
  participants: User[];
  lastMessage?: ChatMessage;
  createdAt: string;
}

// 후기
export interface Review {
  id: number;
  helpRequestId: number;
  reviewerId: number;
  targetId: number;
  rating: number;
  content: string;
  createdAt: string;
}

// 커뮤니티 게시글 카테고리
export type PostCategory = 'INFO' | 'QUESTION' | 'CHAT' | 'CULTURE';

// 커뮤니티 게시글
export interface CommunityPost {
  id: number;
  category: PostCategory;
  title: string;
  content: string;
  images: string[];
  author: string;
  authorId?: number;
  university: string;
  userType: UserType;
  likes: number;
  comments: number;
  createdAt: string;
}

// 커뮤니티 댓글
export interface Comment {
  id: number;
  postId: number;
  author: string;
  university: string;
  userType: UserType;
  content: string;
  createdAt: string;
}

// 앱 알림
export interface AppNotification {
  id: number;
  type: 'COMMENT' | 'REPLY' | 'LIKE' | 'HELP_OFFER' | 'REVIEW_REQUEST' | 'REVIEW_RECEIVED' | 'HELP_COMPLETED' | 'STUDENT_ID_APPROVED' | 'STUDENT_ID_REJECTED';
  message: string;
  referenceId?: number;
  referenceType?: 'POST' | 'COMMENT' | 'HELP_REQUEST' | 'NONE';
  isRead: boolean;
  createdAt: string;
  recipientId: number;
}

// API 공통 응답 형식
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// 로그인 응답
export interface LoginResponse {
  accessToken: string;
  user: User;
}
