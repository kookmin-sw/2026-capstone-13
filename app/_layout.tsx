// 루트 레이아웃 - 인증 상태에 따라 화면 분기
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
  const { isLoggedIn, isLoading, loadUser } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // 앱 시작 시 저장된 토큰으로 사용자 정보 로드
  useEffect(() => {
    loadUser();
  }, []);

  // 인증 상태에 따라 화면 자동 이동
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isLoggedIn && !inAuthGroup) {
      // 로그인 안 됨 → 로그인 화면으로
      router.replace('/(auth)/login');
    } else if (isLoggedIn && inAuthGroup) {
      // 로그인 됨 → 메인 화면으로
      router.replace('/(main)/home');
    }
  }, [isLoggedIn, isLoading, segments]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
