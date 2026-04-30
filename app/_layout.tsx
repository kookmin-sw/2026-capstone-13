// 루트 레이아웃 - 인증 상태에 따라 화면 분기
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../stores/authStore';
import { useAppPermissions } from '../hooks/useAppPermissions';
import { usePushNotifications } from '../hooks/usePushNotifications';

// 사용자 폰트 크기 설정과 무관하게 앱 내 폰트 크기 고정
if (Text.defaultProps == null) Text.defaultProps = {};
Text.defaultProps.allowFontScaling = false;
if (TextInput.defaultProps == null) TextInput.defaultProps = {};
TextInput.defaultProps.allowFontScaling = false;

export default function RootLayout() {
  const { user, isLoading, isNewUser, loadUser } = useAuthStore();
  useAppPermissions();
  usePushNotifications(user?.id);
  const segments = useSegments();
  const router = useRouter();
  const firstSegment = segments[0];

  // 앱 시작 시 저장된 토큰으로 사용자 정보 로드
  useEffect(() => {
    loadUser();
  }, []);

  // 로그인 완료 후 isNewUser이면 프로필 설정으로 이동
  useEffect(() => {
    if (isLoading) return;
    if (!user) return;

    const inAuth = firstSegment === '(auth)';
    const inProfileSetup = firstSegment === 'profile-setup';

    if (isNewUser && !inProfileSetup) {
      router.replace('/profile-setup');
    } else if (!isNewUser && inAuth) {
      router.replace('/(main)/home');
    }
  }, [user, isLoading, isNewUser, firstSegment]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="language-setup" />
        <Stack.Screen name="profile-setup" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="request-detail" />
        <Stack.Screen name="chatroom" />
        <Stack.Screen name="community-write" />
        <Stack.Screen name="search" />
        <Stack.Screen name="my-requests" />
        <Stack.Screen name="my-help-history" />
        <Stack.Screen name="change-password" />
      </Stack>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}
