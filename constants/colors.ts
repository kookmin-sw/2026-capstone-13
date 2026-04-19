// 앱 전체에서 사용하는 색상 팔레트
import type { HelpCategory, HelpMethod, RequestStatus } from '../types';

export const Colors = {
  // 메인 색상
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#EEF2FF',

  // 배경
  background: '#F5F7FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  // 텍스트
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textWhite: '#FFFFFF',

  // 상태 색상
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // 카테고리 색상
  categoryBank: '#F59E0B',
  categoryHospital: '#EF4444',
  categorySchool: '#8B5CF6',
  categoryDaily: '#10B981',
  categoryOther: '#6B7280',

  // 도움 방식 색상
  methodChat: '#3B82F6',
  methodVideo: '#8B5CF6',
  methodOffline: '#10B981',

  // 보더, 구분선
  border: '#E5E7EB',
  divider: '#F3F4F6',

  // 기타
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// 카테고리 라벨 (한국어)
export const CategoryLabels: Record<HelpCategory, string> = {
  BANK: '🏢 행정',
  HOSPITAL: '🏥 병원',
  SCHOOL: '📚 학업',
  DAILY: '🏠 생활',
  OTHER: '⋯ 기타',
};

// 도움 방식 라벨 (한국어)
export const MethodLabels: Record<HelpMethod, string> = {
  CHAT: '💬 채팅',
  VIDEO_CALL: '📹 영상통화',
  OFFLINE: '🤝 오프라인',
};

// 상태 라벨
export const StatusLabels: Record<RequestStatus, string> = {
  WAITING: '대기중',
  MATCHED: '대기중',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  CANCELLED: '취소됨',
};
