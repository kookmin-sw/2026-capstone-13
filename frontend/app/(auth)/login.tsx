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
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';

const BLUE = '#3B6FE8';
const BLUE_L = '#EEF4FF';

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸', native: 'English', selectLabel: 'Select Language', image: require('../../logo/usa.webp') },
  { code: 'ko', flag: '🇰🇷', native: '한국어', selectLabel: '언어 선택', image: require('../../logo/korea.png') },
  { code: 'zh', flag: '🇨🇳', native: '中文 (简体)', selectLabel: '选择语言', image: require('../../logo/china.avif') },
  { code: 'ja', flag: '🇯🇵', native: '日本語', selectLabel: '言語選択', image: require('../../logo/japan.png') },
  { code: 'vi', flag: '🇻🇳', native: 'Tiếng Việt', selectLabel: 'Chọn ngôn ngữ', image: require('../../logo/vietnam.jpg') },
  { code: 'mn', flag: '🇲🇳', native: 'Монгол хэл', selectLabel: 'Хэл сонгох', image: require('../../logo/mongolia.jpg') },
  { code: 'uz', flag: '🇺🇿', native: 'Oʻzbek tili', selectLabel: 'Tilni tanlang', image: require('../../logo/uzbekistan.jpg') },
  { code: 'th', flag: '🇹🇭', native: 'ภาษาไทย', selectLabel: 'เลือกภาษา', image: require('../../logo/thailand.png') },
];

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { login, isLoading, clearError, user } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const topBarOpacity = useRef(new Animated.Value(0)).current;

  const s0opacity = useRef(new Animated.Value(0)).current;
  const s0ty = useRef(new Animated.Value(s(22))).current;
  const s1opacity = useRef(new Animated.Value(0)).current;
  const s1ty = useRef(new Animated.Value(s(22))).current;
  const s2opacity = useRef(new Animated.Value(0)).current;
  const s2ty = useRef(new Animated.Value(s(22))).current;
  const s3opacity = useRef(new Animated.Value(0)).current;
  const s3ty = useRef(new Animated.Value(s(22))).current;
  const s4opacity = useRef(new Animated.Value(0)).current;
  const s4ty = useRef(new Animated.Value(s(22))).current;

  const stagger = [
    { opacity: s0opacity, translateY: s0ty },
    { opacity: s1opacity, translateY: s1ty },
    { opacity: s2opacity, translateY: s2ty },
    { opacity: s3opacity, translateY: s3ty },
    { opacity: s4opacity, translateY: s4ty },
  ];

  const ease = Easing.out(Easing.cubic);

  useEffect(() => {
    if (user) {
      if (!user.isProfileSetup) {
        router.replace('/profile-setup');
      } else {
        router.replace('/(main)/home');
      }
      return;
    }

    const staggerAnims = stagger.map((item, i) =>
      Animated.parallel([
        Animated.timing(item.opacity, {
          toValue: 1,
          duration: 420,
          delay: i * 70,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(item.translateY, {
          toValue: 0,
          duration: 420,
          delay: i * 70,
          easing: ease,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 550,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(topBarOpacity, {
          toValue: 1,
          duration: 420,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.stagger(0, staggerAnims),
      ]),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.confirm'), t('auth.enterEmailPassword'));
      return;
    }

    const success = await login({ email, password });
    if (success) {
      router.replace('/(main)/home');
    } else {
      const currentError = useAuthStore.getState().error;
      Alert.alert(t('auth.loginFailed'), currentError ?? t('auth.loginError'));
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
              {currentLang.image ? (
                <Image source={currentLang.image} style={styles.langButtonImage} resizeMode="cover" />
              ) : (
                <Text style={styles.langButtonFlag}>{currentLang.flag}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.content}>
            {/* 로고 */}
            <Animated.View
              style={[
                styles.logoContainer,
                { opacity: logoOpacity, transform: [{ scale: logoScale }] },
              ]}
            >
              <Image
                source={require('../../logo/logo2.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* 폼 - 각 요소 stagger */}
            <Animated.View
              style={{
                opacity: stagger[0].opacity,
                transform: [{ translateY: stagger[0].translateY }],
              }}
            >
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.email')}
                  placeholderTextColor={Colors.textLight}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.password')}
                  placeholderTextColor={Colors.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </Animated.View>

            <Animated.View
              style={{
                opacity: stagger[1].opacity,
                transform: [{ translateY: stagger[1].translateY }],
              }}
            >
              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.disabledButton]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.textWhite} />
                ) : (
                  <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={{
                opacity: stagger[2].opacity,
                transform: [{ translateY: stagger[2].translateY }],
              }}
            >
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('common.or')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/change-password')}>
                <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={{
                opacity: stagger[3].opacity,
                transform: [{ translateY: stagger[3].translateY }],
              }}
            >
              <View style={styles.registerRow}>
                <Text style={styles.registerText}>{t('auth.noAccount')}</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register-type')}>
                  <Text style={styles.registerHighlight}>{t('auth.register')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Animated.View
              style={{
                opacity: stagger[4].opacity,
                transform: [{ translateY: stagger[4].translateY }],
              }}
            >
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
                <Text style={styles.modalTitle}>{currentLang.selectLabel}</Text>
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
                      {item.image ? (
                        <Image source={item.image} style={styles.modalFlagImage} resizeMode="cover" />
                      ) : (
                        <Text style={styles.modalFlag}>{item.flag}</Text>
                      )}
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
    width: s(34),
    height: s(34),
    borderRadius: s(17),
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  langButtonImage: {
    width: s(56),
    height: s(56),
    borderRadius: s(28),
  },
  langButtonFlag: {
    fontSize: s(26),
    lineHeight: s(32),
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: s(32),
    paddingBottom: s(40),
    marginTop: s(40),
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
    marginTop: s(10),
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
  modalFlagImage: {
    width: s(28),
    height: s(28),
    borderRadius: s(14),
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
