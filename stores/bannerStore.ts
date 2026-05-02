// 인앱 배너 알림 상태 관리
import { create } from 'zustand';

export type BannerType = 'chat' | 'notification';

export interface BannerItem {
  id: string;
  title: string;
  body: string;
  type: BannerType;
  roomId?: number;
  roomParams?: {
    requestTitle: string;
    partnerNickname: string;
    partnerProfileImage?: string;
    requestStatus?: string;
    requesterId?: string;
    partnerId?: string;
    partnerPreferredLanguage?: string;
    isDirect?: boolean;
  };
}

interface BannerState {
  current: BannerItem | null;
  queue: BannerItem[];
  showBanner: (item: Omit<BannerItem, 'id'>) => void;
  dismissCurrent: () => void;
}

export const useBannerStore = create<BannerState>((set, get) => ({
  current: null,
  queue: [],

  showBanner: (item) => {
    const newItem: BannerItem = { ...item, id: String(Date.now()) + Math.random() };
    const { current, queue } = get();
    if (!current) {
      set({ current: newItem });
    } else {
      // 최대 3개까지만 큐에 쌓기
      if (queue.length < 3) {
        set({ queue: [...queue, newItem] });
      }
    }
  },

  dismissCurrent: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      set({ current: next, queue: rest });
    } else {
      set({ current: null });
    }
  },
}));
