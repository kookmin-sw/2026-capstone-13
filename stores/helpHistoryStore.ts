// 한국인 유저가 도움을 준 내역 상태 관리 (Zustand)
import { create } from 'zustand';
import type { HelpRequest } from '../types';
import { getHelpedRequests } from '../services/helpService';

export interface HelpHistoryItem extends HelpRequest {
  helpedAt: string;
}

interface HelpHistoryState {
  helpHistory: HelpHistoryItem[];
  isLoading: boolean;
  fetchHelpHistory: () => Promise<void>;
  addHelpHistory: (request: HelpRequest) => void;
}

// 목업 데이터 (백엔드 연결 실패 시 폴백)
const MOCK_HELP_HISTORY: HelpHistoryItem[] = [
  {
    id: 9001,
    title: '은행 통장 개설 도움 요청',
    description: '한국 은행에서 통장을 개설하려고 하는데 도움이 필요해요.',
    category: 'BANK',
    helpMethod: 'OFFLINE',
    status: 'COMPLETED',
    requester: {
      id: 10,
      email: 'foreign1@test.com',
      nickname: '왕샤오밍',
      userType: 'INTERNATIONAL',
      university: '국민대학교',
      rating: 4.5,
      helpCount: 0,
      createdAt: '2025-01-01T00:00:00Z',
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    helpedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 9002,
    title: '병원 예약 전화 통역 부탁드려요',
    description: '피부과 예약을 하고 싶은데 한국어로 전화하기 어렵습니다.',
    category: 'HOSPITAL',
    helpMethod: 'CHAT',
    status: 'COMPLETED',
    requester: {
      id: 11,
      email: 'foreign2@test.com',
      nickname: '타나카유이',
      userType: 'INTERNATIONAL',
      university: '국민대학교',
      rating: 4.8,
      helpCount: 0,
      createdAt: '2025-01-01T00:00:00Z',
    },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    helpedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const useHelpHistoryStore = create<HelpHistoryState>((set) => ({
  helpHistory: [],
  isLoading: false,

  // 백엔드에서 내가 도움을 준 목록 조회 (실패 시 목업 데이터로 폴백)
  fetchHelpHistory: async () => {
    set({ isLoading: true });
    try {
      const response = await getHelpedRequests();
      if (response.success) {
        const items: HelpHistoryItem[] = response.data.map((r) => ({
          ...r,
          helpedAt: r.updatedAt,
        }));
        set({ helpHistory: items, isLoading: false });
      } else {
        set({ helpHistory: MOCK_HELP_HISTORY, isLoading: false });
      }
    } catch {
      // 백엔드 미연결 시 목업 데이터 표시
      set({ helpHistory: MOCK_HELP_HISTORY, isLoading: false });
    }
  },

  addHelpHistory: (request: HelpRequest) => {
    const item: HelpHistoryItem = {
      ...request,
      helpedAt: new Date().toISOString(),
    };
    set((state) => ({ helpHistory: [item, ...state.helpHistory] }));
  },
}));
