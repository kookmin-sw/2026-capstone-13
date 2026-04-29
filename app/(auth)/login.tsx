// 로그인 화면
import { useState } from 'react';
import { s } from '../../utils/scale';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';

const BLUE = '#3B6FE8';

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
      const currentError = useAuthStore.getState().error;
      Alert.alert('로그인 실패', currentError ?? '로그인에 실패했습니다.');
      clearError();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={styles.container}>
      <View style={styles.content}>
        {/* 로고 */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../logo/logo2.png')}
            style={styles.logo}
            resizeMode="contain"
          />
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

        {/* 구분선 */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* 비밀번호 찾기 */}
        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
        </TouchableOpacity>

        {/* 회원가입 링크 */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>계정이 없으신가요? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register-type')}>
            <Text style={styles.registerHighlight}>가입하기</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* 개발용 테스트 계정 - 하단 고정 */}
      <View style={styles.testContainer}>
        <Text style={styles.testLabel}>개발용 테스트</Text>
        <View style={styles.testTopButtons}>
          <TouchableOpacity
            style={styles.testButtonFirst}
            onPress={async () => {
              await AsyncStorage.removeItem('languageSelected');
              useAuthStore.setState({ languageSelected: false });
              router.replace('/splash');
            }}
          >
            <Text style={styles.testButtonFirstText}>🚀 첫 입장하기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.testButtonNew}
            onPress={() => router.push('/profile-setup')}
          >
            <Text style={styles.testButtonNewText}>👤 신규사용자</Text>
          </TouchableOpacity>
        </View>
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
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: s(32),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: s(36),
  },
  logo: {
    width: s(180),
    height: s(100),
  },
  form: {
    gap: s(10),
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: s(8),
    paddingHorizontal: s(18),
    paddingVertical: s(13),
    fontSize: s(17),
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loginButton: {
    backgroundColor: BLUE,
    borderRadius: s(8),
    paddingVertical: s(14),
    alignItems: 'center',
    marginTop: s(4),
    opacity: 0.85,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: Colors.textWhite,
    fontSize: s(18),
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: s(20),
    gap: s(10),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: s(13),
    color: Colors.textLight,
  },
  forgotPassword: {
    alignItems: 'center',
    marginBottom: s(16),
  },
  forgotPasswordText: {
    fontSize: s(13),
    color: BLUE,
    fontWeight: '500',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: s(16),
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: s(4),
  },
  registerText: {
    fontSize: s(14),
    color: Colors.textSecondary,
  },
  registerHighlight: {
    fontSize: s(14),
    color: BLUE,
    fontWeight: '700',
  },
  testContainer: {
    position: 'absolute',
    bottom: s(32),
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: s(10),
  },
  testLabel: {
    fontSize: s(11),
    color: Colors.textLight,
    letterSpacing: 1,
  },
  testButtons: {
    flexDirection: 'row',
    gap: s(10),
  },
  testButton: {
    flex: 1,
    paddingVertical: s(10),
    borderRadius: s(10),
    alignItems: 'center',
    borderWidth: 1,
  },
  testTopButtons: {
    flexDirection: 'row',
    gap: s(10),
  },
  testButtonFirst: {
    paddingHorizontal: s(20),
    paddingVertical: s(9),
    borderRadius: s(20),
    borderWidth: 1,
    borderColor: BLUE,
    backgroundColor: '#EEF4FF',
  },
  testButtonFirstText: {
    fontSize: s(12),
    fontWeight: '600',
    color: BLUE,
  },
  testButtonNew: {
    paddingHorizontal: s(20),
    paddingVertical: s(9),
    borderRadius: s(20),
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  testButtonNewText: {
    fontSize: s(12),
    fontWeight: '600',
    color: '#10B981',
  },
  testButtonInternational: {
    borderColor: BLUE,
    backgroundColor: '#EBF5FF',
  },
  testButtonKorean: {
    borderColor: '#E53935',
    backgroundColor: '#FFEBEE',
  },
  testButtonText: {
    fontSize: s(13),
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
