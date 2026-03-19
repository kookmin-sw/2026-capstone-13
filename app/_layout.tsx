// 루트 레이아웃 - 인증 상태에 따라 화면 분기
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TextInput } from 'react-native';

// 사용자 폰트 크기 설정과 무관하게 앱 내 폰트 크기 고정
if (Text.defaultProps == null) Text.defaultProps = {};
Text.defaultProps.allowFontScaling = false;
if (TextInput.defaultProps == null) TextInput.defaultProps = {};
TextInput.defaultProps.allowFontScaling = false;
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
  const { user, isLoading, loadUser } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const firstSegment = segments[0];

  // 앱 시작 시 저장된 토큰으로 사용자 정보 로드
  useEffect(() => {
    loadUser();
  }, []);

  // 인증 상태에 따라 화면 자동 이동
  useEffect(() => {
    if (isLoading) return;

    const isLoggedIn = user !== null;
    const inAuthGroup = firstSegment === '(auth)';

    if (!isLoggedIn && !inAuthGroup) {
      // 로그인 안 됨 → 로그인 화면으로
      router.replace('/(auth)/login');
    } else if (isLoggedIn && inAuthGroup) {
      // 로그인 됨 → 메인 화면으로
      router.replace('/(main)/home');
    }
  }, [user, isLoading, firstSegment]);

  // loadUser 완료 전까지 로딩 스피너 표시
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="request-detail" />
        <Stack.Screen name="chatroom" />
        <Stack.Screen name="community-write" />
        <Stack.Screen name="search" />
        <Stack.Screen name="my-requests" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
});
