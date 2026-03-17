import { create } from 'zustand';

interface ChatState {
  unreadCount: number;
  activeChatroomId: number | null;
  // 유저별 나간 방 목록: { "userId": [roomId, ...] }
  leftRooms: Record<string, number[]>;
  incrementUnread: () => void;
  clearUnread: () => void;
  setActiveChatroom: (id: number | null) => void;
  leaveRoom: (roomId: number, userId: number) => void;
  hasLeft: (roomId: number, userId: number) => boolean;
}

export const useChatStore = create<ChatState>((set, get) => ({
  unreadCount: 0,
  activeChatroomId: null,
  leftRooms: {},
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  clearUnread: () => set({ unreadCount: 0 }),
  setActiveChatroom: (id) => set({ activeChatroomId: id }),
  leaveRoom: (roomId, userId) => {
    const key = String(userId);
    const existing = get().leftRooms[key] ?? [];
    if (existing.includes(roomId)) return;
    set((state) => ({
      leftRooms: { ...state.leftRooms, [key]: [...existing, roomId] },
    }));
  },
  hasLeft: (roomId, userId) => {
    const key = String(userId);
    return (get().leftRooms[key] ?? []).includes(roomId);
  },
}));
