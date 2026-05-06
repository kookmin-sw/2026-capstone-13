import * as SecureStore from 'expo-secure-store';

const STREAK_KEY = 'login_streak_count';
const LAST_DATE_KEY = 'login_streak_last_date';

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getYesterdayString(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * 앱 접속 시 호출 → 연속 접속일 업데이트 후 반환
 */
export async function updateAndGetStreak(): Promise<number> {
  const today = getTodayString();
  const yesterday = getYesterdayString();

  const lastDate = await SecureStore.getItemAsync(LAST_DATE_KEY);
  const storedStreak = await SecureStore.getItemAsync(STREAK_KEY);
  const streak = storedStreak ? parseInt(storedStreak, 10) : 0;

  if (lastDate === today) {
    // 오늘 이미 접속함 → 그대로 반환
    return streak;
  } else if (lastDate === yesterday) {
    // 어제 접속 → 연속 +1
    const newStreak = streak + 1;
    await SecureStore.setItemAsync(STREAK_KEY, String(newStreak));
    await SecureStore.setItemAsync(LAST_DATE_KEY, today);
    return newStreak;
  } else {
    // 이틀 이상 끊김 (또는 첫 접속) → 1로 초기화
    await SecureStore.setItemAsync(STREAK_KEY, '1');
    await SecureStore.setItemAsync(LAST_DATE_KEY, today);
    return 1;
  }
}
