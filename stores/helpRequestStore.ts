// 내가 작성한 도움 요청 로컬 상태 관리 (Zustand)
import { create } from 'zustand';
import type { HelpRequest, HelpCategory, HelpMethod, User } from '../types';

interface NewHelpRequestInput {
  title: string;
  description: string;
  category: HelpCategory;
  helpMethod: HelpMethod;
  requester: User;
}

interface HelpRequestState {
  myRequests: HelpRequest[];
  addMyRequest: (input: NewHelpRequestInput) => void;
}

let nextId = 1000; // MOCK_REQUESTS id와 충돌 방지

export const useHelpRequestStore = create<HelpRequestState>((set) => ({
  myRequests: [],

  addMyRequest: (input: NewHelpRequestInput) => {
    const now = new Date().toISOString();
    const newRequest: HelpRequest = {
      id: nextId++,
      title: input.title,
      description: input.description,
      category: input.category,
      helpMethod: input.helpMethod,
      status: 'WAITING',
      requester: input.requester,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ myRequests: [newRequest, ...state.myRequests] }));
  },
}));
