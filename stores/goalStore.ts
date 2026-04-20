import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'login_streak';
const STREAK_DATE_KEY = 'login_streak_last_date';
const MAX_DOTS = 10;

interface GoalState {
  monthlyGoal: number;
  loginStreak: number;
  setMonthlyGoal: (goal: number) => void;
  checkAndUpdateStreak: () => Promise<void>;
}

export const useGoalStore = create<GoalState>((set) => ({
  monthlyGoal: 0,
  loginStreak: 0,

  setMonthlyGoal: (goal) => set({ monthlyGoal: goal }),

  checkAndUpdateStreak: async () => {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const [savedDate, savedStreak] = await Promise.all([
      AsyncStorage.getItem(STREAK_DATE_KEY),
      AsyncStorage.getItem(STREAK_KEY),
    ]);

    if (savedDate === today) {
      // 오늘 이미 접속 — 저장된 값 그대로 로드
      set({ loginStreak: Math.min(parseInt(savedStreak ?? '0', 10), MAX_DOTS) });
      return;
    }

    // 오늘 첫 접속 — streak +1 (MAX_DOTS 초과하지 않게)
    const newStreak = Math.min((parseInt(savedStreak ?? '0', 10) + 1), MAX_DOTS);
    await Promise.all([
      AsyncStorage.setItem(STREAK_DATE_KEY, today),
      AsyncStorage.setItem(STREAK_KEY, String(newStreak)),
    ]);
    set({ loginStreak: newStreak });
  },
}));
