// 앱 시작 스플래시 화면 - logo1 → logo2 순서로 애니메이션 후 언어선택으로 이동
import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../stores/authStore';

export default function SplashScreen() {
  const router = useRouter();
  const { user, isLoading, languageSelected } = useAuthStore();

  const logo2Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logo2Opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(1200),
    ]).start(() => {
      if (!languageSelected) {
        router.replace('/language-setup');
      } else if (!user) {
        router.replace('/(auth)/login');
      } else if (!user.isProfileSetup) {
        router.replace('/profile-setup');
      } else {
        router.replace('/(main)/home');
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Animated.Image
        source={require('../logo/logo2.png')}
        style={[styles.logo, { opacity: logo2Opacity }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 240,
    height: 240,
  },
});
