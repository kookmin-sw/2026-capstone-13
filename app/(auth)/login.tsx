// 로그인 화면 - 로고 페이드인 후 폼 등장
import { useState, useEffect, useRef } from 'react';
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
  Modal,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';

const BLUE = '#3B6FE8';
const BLUE_L = '#EEF4FF';

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸', native: 'English' },
  { code: 'ko', flag: '🇰🇷', native: '한국어' },
  { code: 'zh', flag: '🇨🇳', native: '中文 (简体)' },
  { code: 'ja', flag: '🇯🇵', native: '日本語' },
  { code: 'vi', flag: '🇻🇳', native: 'Tiếng Việt' },
  { code: 'mn', flag: '🇲🇳', native: 'Монгол хэл' },
  { code: 'uz', flag: '🇺🇿', native: 'Oʻzbek tili' },
  { code: 'th', flag: '🇹🇭', native: 'ภาษาไทย' },
];

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, clearError, user } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(s(16))).current;
  const topBarOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 이미 로그인된 경우 바로 이동
    if (user) {
      if (!user.isProfileSetup) {
        router.replace('/profile-setup');
      } else {
        router.replace('/(main)/home');
      }
      return;
    }

    Animated.sequence([
      // 로고 페이드인
      Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.delay(400),
      // 폼 + 상단 버튼 등장
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(formTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(topBarOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

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

  const currentLang = LANGUAGES.find((l) => l.code === selectedLang) ?? LANGUAGES[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* 우상단 언어 선택 버튼 */}
          <Animated.View style={[styles.topBar, { opacity: topBarOpacity }]}>
            <TouchableOpacity
              style={styles.langButton}
              onPress={() => setLangModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.langButtonFlag}>{currentLang.flag}</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.content}>
            {/* 로고 */}
            <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
              <Image
                source={require('../../logo/logo2.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* 폼 */}
            <Animated.View
              style={{ opacity: formOpacity, transform: [{ translateY: formTranslateY }] }}
            >
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

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>또는</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
              </TouchableOpacity>

              <View style={styles.registerRow}>
                <Text style={styles.registerText}>계정이 없으신가요? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register-type')}>
                  <Text style={styles.registerHighlight}>가입하기</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.testTopButtons}>
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

            </Animated.View>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* 언어 선택 모달 */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setLangModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>언어 선택 / Select Language</Text>
                {LANGUAGES.map((item) => {
                  const isSelected = selectedLang === item.code;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                      onPress={() => {
                        setSelectedLang(item.code);
                        setLangModalVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalFlag}>{item.flag}</Text>
                      <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                        {item.native}
                      </Text>
                      {isSelected && <View style={styles.modalRadioDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: s(16),
    paddingTop: s(12),
  },
  langButton: {
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langButtonFlag: {
    fontSize: s(32),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: s(32),
    paddingBottom: s(40),
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
  testTopButtons: {
    marginTop: s(8),
    marginBottom: s(6),
  },
  testButtonNew: {
    paddingVertical: s(10),
    borderRadius: s(10),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  testButtonNewText: {
    fontSize: s(13),
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  testButtons: {
    flexDirection: 'row',
    gap: s(10),
    marginTop: s(8),
  },
  testButton: {
    flex: 1,
    paddingVertical: s(10),
    borderRadius: s(10),
    alignItems: 'center',
    borderWidth: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(24),
  },
  modalSheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: s(20),
    paddingVertical: s(20),
    paddingHorizontal: s(16),
    gap: s(6),
  },
  modalTitle: {
    fontSize: s(16),
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: s(8),
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: s(10),
    paddingHorizontal: s(14),
    paddingVertical: s(12),
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: s(10),
  },
  modalItemSelected: {
    borderColor: BLUE,
    backgroundColor: BLUE_L,
  },
  modalFlag: {
    fontSize: s(20),
  },
  modalItemText: {
    flex: 1,
    fontSize: s(15),
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  modalItemTextSelected: {
    color: BLUE,
    fontWeight: '700',
  },
  modalRadioDot: {
    width: s(10),
    height: s(10),
    borderRadius: s(5),
    backgroundColor: BLUE,
  },
});
