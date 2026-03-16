// 로그인 화면
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    const success = await login({ email, password });
    if (success) {
      router.replace('/(main)/home');
    } else {
      // 최신 에러는 store에서 직접 읽어야 stale closure를 피할 수 있음
      const currentError = useAuthStore.getState().error;
      Alert.alert('로그인 실패', currentError ?? '로그인에 실패했습니다.');
      clearError();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* 로고 영역 */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🇰🇷</Text>
          <Text style={styles.title}>도와줘코리안</Text>
          <Text style={styles.subtitle}>유학생과 한국인 학생을 연결합니다</Text>
        </View>

        {/* 입력 폼 */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor={Colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="비밀번호"
            placeholderTextColor={Colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.textWhite} />
            ) : (
              <Text style={styles.loginButtonText}>로그인</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 회원가입 링크 */}
        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.registerText}>
            계정이 없으신가요? <Text style={styles.registerHighlight}>회원가입</Text>
          </Text>
        </TouchableOpacity>

        {/* 개발용 테스트 계정 */}
        <View style={styles.testContainer}>
          <Text style={styles.testLabel}>개발용 테스트</Text>
          <View style={styles.testButtons}>
            <TouchableOpacity
              style={[styles.testButton, styles.testButtonInternational]}
              onPress={async () => {
                const success = await login({
                  email: 'sang020531@naver.com',
                  password: 'sang3036828@',
                });
                if (success) {
                  router.replace('/(main)/home');
                } else {
                  Alert.alert('실패', '외국인 테스트 계정 로그인 실패');
                }
              }}
            >
              <Text style={styles.testButtonText}>🌍 외국인 계정</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.testButton, styles.testButtonKorean]}
              onPress={async () => {
                const success = await login({
                  email: 'sang020531@kookmin.ac.kr',
                  password: 'sang3036828@',
                });
                if (success) {
                  router.replace('/(main)/home');
                } else {
                  Alert.alert('실패', '한국인 테스트 계정 로그인 실패');
                }
              }}
            >
              <Text style={styles.testButtonText}>🇰🇷 한국인 계정</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.textWhite,
    fontSize: 18,
    fontWeight: '700',
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  registerHighlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  testContainer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 10,
  },
  testLabel: {
    fontSize: 11,
    color: Colors.textLight,
    letterSpacing: 1,
  },
  testButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  testButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  testButtonInternational: {
    borderColor: Colors.primary,
    backgroundColor: '#EBF5FF',
  },
  testButtonKorean: {
    borderColor: '#E53935',
    backgroundColor: '#FFEBEE',
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
