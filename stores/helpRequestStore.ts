// 내가 작성한 도움 요청 상태 관리 (Zustand)
import { create } from 'zustand';
import { getMyRequests } from '../services/helpService';
import type { HelpRequest } from '../types';

interface HelpRequestState {
  myRequests: HelpRequest[];
  isLoading: boolean;
  addRequest: (request: HelpRequest) => void;
  fetchMyRequests: () => Promise<void>;
}

export const useHelpRequestStore = create<HelpRequestState>((set) => ({
  myRequests: [],
  isLoading: false,

  addRequest: (request: HelpRequest) => {
    set((state) => ({ myRequests: [request, ...state.myRequests] }));
  },

  fetchMyRequests: async () => {
    set({ isLoading: true });
    try {
      const res = await getMyRequests();
      if (res.success) set({ myRequests: res.data });
    } catch {
      // 네트워크 오류 시 기존 목록 유지
    } finally {
      set({ isLoading: false });
    }
  },
}));
