import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatState {
  unreadCount: number;
  activeChatroomId: number | null;
  // 유저별 나간 방 목록: { "userId": [roomId, ...] }
  leftRooms: Record<string, number[]>;
  // 방별 안읽음 카운트 (UNREAD_UPDATE 실시간 반영용)
  roomUnreadCounts: Record<number, number>;
  incrementUnread: () => void;
  setUnreadCount: (count: number) => void;
  clearUnread: () => void;
  setActiveChatroom: (id: number | null) => void;
  leaveRoom: (roomId: number, userId: number) => void;
  rejoinRoom: (roomId: number, userId: number) => void;
  hasLeft: (roomId: number, userId: number) => boolean;
  setRoomUnreadCount: (roomId: number, count: number) => void;
  initRoomUnreadCounts: (counts: Record<number, number>) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      unreadCount: 0,
      activeChatroomId: null,
      leftRooms: {},
      roomUnreadCounts: {},
      incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
      setUnreadCount: (count) => set({ unreadCount: count }),
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
      rejoinRoom: (roomId, userId) => {
        const key = String(userId);
        const existing = get().leftRooms[key] ?? [];
        if (!existing.includes(roomId)) return;
        set((state) => ({
          leftRooms: { ...state.leftRooms, [key]: existing.filter((id) => id !== roomId) },
        }));
      },
      hasLeft: (roomId, userId) => {
        const key = String(userId);
        return (get().leftRooms[key] ?? []).includes(roomId);
      },
      setRoomUnreadCount: (roomId, count) =>
        set((state) => ({ roomUnreadCounts: { ...state.roomUnreadCounts, [roomId]: count } })),
      initRoomUnreadCounts: (counts) => set({ roomUnreadCounts: counts }),
    }),
    {
      name: 'chat-store',
      storage: createJSONStorage(() => AsyncStorage),
      // activeChatroomId, unreadCount은 앱 재시작 시 초기화
      partialize: (state) => ({ leftRooms: state.leftRooms }),
    }
  )
);
