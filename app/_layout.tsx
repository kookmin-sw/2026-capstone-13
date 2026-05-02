// 루트 레이아웃 - 인증 상태에 따라 화면 분기
import { useEffect, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../stores/authStore';
import { useAppPermissions } from '../hooks/useAppPermissions';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { initI18n } from '../i18n';
import i18n from 'i18next';
import PermissionsModal from '../components/PermissionsModal';

// 사용자 폰트 크기 설정과 무관하게 앱 내 폰트 크기 고정
const AppText = Text as typeof Text & { defaultProps?: { allowFontScaling?: boolean } };
const AppTextInput = TextInput as typeof TextInput & { defaultProps?: { allowFontScaling?: boolean } };
if (AppText.defaultProps == null) AppText.defaultProps = {};
AppText.defaultProps.allowFontScaling = false;
if (AppTextInput.defaultProps == null) AppTextInput.defaultProps = {};
AppTextInput.defaultProps.allowFontScaling = false;

export default function RootLayout() {
  const { user, isLoading, isNewUser, loadUser } = useAuthStore();
  const { modalVisible, handleConfirm } = useAppPermissions();
  const [isI18nReady, setIsI18nReady] = useState(false);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const handler = () => forceRender((n) => n + 1);
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, []);
  usePushNotifications(user?.id);
  const segments = useSegments();
  const router = useRouter();
  const firstSegment = segments[0];

  // 앱 시작 시 i18n 초기화 후 사용자 정보 로드
  useEffect(() => {
    initI18n()
      .then(() => loadUser())
      .finally(() => setIsI18nReady(true));
  }, [loadUser]);

  // 로그인 완료 후 isNewUser이면 프로필 설정으로 이동
  useEffect(() => {
    if (!isI18nReady) return;
    if (isLoading) return;
    if (!user) return;

    const inAuth = firstSegment === '(auth)';
    const inProfileSetup = String(firstSegment) === 'profile-setup';

    if (isNewUser && !inProfileSetup) {
      router.replace('/profile-setup' as Href);
    } else if (!isNewUser && inAuth) {
      router.replace('/(main)/home');
    }
  }, [user, isLoading, isNewUser, firstSegment, isI18nReady, router]);

  if (!isI18nReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PermissionsModal visible={modalVisible} onConfirm={handleConfirm} />
      <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen name="index" />
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
