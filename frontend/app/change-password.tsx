import { useState, useEffect, useRef } from 'react';
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
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendVerificationCode, resetPassword } from '../services/authService';
import { useAuthStore } from '../stores/authStore';
import { s } from '../utils/scale';

const BLUE = '#3B6FE8';
const T1 = '#0C1C3C';
const T2 = '#6B7280';
const BG = '#FFFFFF';
const SURFACE = '#FFFFFF';
const BORDER = '#D0E0F8';
const DANGER = '#EF4444';

const CODE_EXPIRE_SEC = 300; // 5분

type Step = 'email' | 'code' | 'password';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(user?.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CODE_EXPIRE_SEC);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setTimeLeft(CODE_EXPIRE_SEC);
    setTimerActive(true);
  };

  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [timerActive]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('알림', '이메일을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await sendVerificationCode(email.trim());
      if (res.success) {
        setStep('code');
        startTimer();
      } else {
        Alert.alert('오류', res.message ?? '인증코드 전송에 실패했습니다.');
      }
    } catch {
      Alert.alert('오류', '가입되지 않은 이메일이거나 서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const res = await sendVerificationCode(email.trim());
      if (res.success) {
        setCode('');
        startTimer();
      } else {
        Alert.alert('오류', res.message ?? '재전송에 실패했습니다.');
      }
    } catch {
      Alert.alert('오류', '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (code.trim().length < 4) {
      Alert.alert('알림', '인증코드를 입력해주세요.');
      return;
    }
    if (timeLeft === 0) {
      Alert.alert('알림', '인증 시간이 만료됐습니다. 코드를 재전송해주세요.');
      return;
    }
    clearInterval(timerRef.current!);
    setTimerActive(false);
    setStep('password');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(email.trim(), code.trim(), newPassword);
      if (res.success) {
        Alert.alert('완료', '비밀번호가 변경됐습니다.', [
          { text: '확인', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('오류', res.message ?? '비밀번호 변경에 실패했습니다.');
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      Alert.alert('오류', `${status ? `[${status}] ` : ''}${msg ?? '서버 오류가 발생했습니다.'}`);
    } finally {
      setLoading(false);
    }
  };

  const stepSubtitles: Record<Step, string> = {
    email: '비밀번호 재설정을 위해 가입한 이메일 주소를 입력해주세요.',
    code: `이메일로 전송된 인증코드를 입력해주세요.`,
    password: '새로 사용할 비밀번호를 입력해주세요.',
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color={T1} />
            </TouchableOpacity>
            <Image source={require('../logo/logo2.png')} style={styles.logo} resizeMode="contain" />
            <View style={{ width: 40 }} />
          </View>
          {/* 스텝 인디케이터 */}
          <View style={styles.stepRow}>
            {(['email', 'code', 'password'] as Step[]).map((s, i) => (
              <View key={s} style={styles.stepItem}>
                <View style={[styles.stepDot, step === s && styles.stepDotActive,
                  (step === 'code' && s === 'email') || (step === 'password' && s !== 'password') ? styles.stepDotDone : null
                ]}>
                  <Text style={styles.stepDotText}>{i + 1}</Text>
                </View>
                {i < 2 && <View style={[styles.stepLine, (step === 'code' && s === 'email') || (step === 'password') ? styles.stepLineDone : null]} />}
              </View>
            ))}
          </View>
          <Text style={[styles.forgotText, step !== 'email' && { opacity: 0 }]}>비밀번호를 잊으셨나요?</Text>
          <Text style={styles.subtitle} numberOfLines={1} adjustsFontSizeToFit>{stepSubtitles[step]}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

          {/* Step 1: 이메일 */}
          {step === 'email' && (
            <View style={styles.fieldGroup}>
              <TextInput
                style={styles.input}
                placeholder="이메일 주소"
                placeholderTextColor={T2}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.primaryBtn, !(/^[^\s@]+@kookmin\.ac\.kr$/.test(email)) && styles.btnGray, loading && styles.btnDisabled]}
                onPress={handleSendCode}
                disabled={loading || !(/^[^\s@]+@kookmin\.ac\.kr$/.test(email))}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>인증코드 전송</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: 인증코드 */}
          {step === 'code' && (
            <View style={styles.fieldGroup}>
              <View style={styles.codeHeader}>
                <Text style={[styles.timer, timeLeft < 60 && styles.timerWarning]}>
                  {formatTime(timeLeft)}
                </Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="인증코드 6자리 입력"
                placeholderTextColor={T2}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              {timeLeft === 0 && (
                <Text style={styles.expiredText}>인증 시간이 만료됐습니다.</Text>
              )}
              <TouchableOpacity
                style={[styles.primaryBtn, (code.trim().length < 6) && styles.btnGray, (loading || timeLeft === 0) && styles.btnDisabled]}
                onPress={handleVerifyCode}
                disabled={loading || timeLeft === 0 || code.trim().length < 6}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>확인</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResendCode}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.resendBtnText}>인증코드 재전송</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: 새 비밀번호 */}
          {step === 'password' && (
            <View style={styles.fieldGroup}>
              <TextInput
                style={styles.input}
                placeholder="새 비밀번호 (6자 이상)"
                placeholderTextColor={T2}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <TextInput
                style={[
                  styles.input,
                  { marginTop: s(6) },
                  confirmPassword.length > 0 && newPassword !== confirmPassword && styles.inputError,
                ]}
                placeholder="비밀번호를 다시 입력하세요"
                placeholderTextColor={T2}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={styles.errorText}>비밀번호가 일치하지 않습니다.</Text>
              )}
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: s(20) }, (newPassword.length < 6 || confirmPassword !== newPassword) && styles.btnGray, loading && styles.btnDisabled]}
                onPress={handleChangePassword}
                disabled={loading || newPassword.length < 6 || confirmPassword !== newPassword}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>비밀번호 변경</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'column',
    paddingHorizontal: s(16),
    paddingTop: Platform.OS === 'ios' ? s(64) : s(28),
    paddingBottom: s(32),
    backgroundColor: SURFACE,
    borderBottomWidth: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: s(32),
  },
  backBtn: {
    width: s(40), height: s(40),
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: s(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: { fontSize: s(17), fontWeight: '700', color: T1 },
  logo: { width: s(120), height: s(40), alignSelf: 'center', marginTop: s(12) },
  forgotText: { fontSize: s(20), fontWeight: '700', color: T1, textAlign: 'center', marginTop: s(44) },

  body: { padding: s(24), paddingTop: s(8), gap: s(8) },

  // 스텝 인디케이터
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: s(24) },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: s(40), height: s(40), borderRadius: s(20),
    backgroundColor: SURFACE,
    borderWidth: 2, borderColor: BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { borderColor: BLUE },
  stepDotDone: { borderColor: BLUE },
  stepDotText: { fontSize: s(16), fontWeight: '700', color: T1 },
  stepLine: { width: s(80), height: 2, backgroundColor: BORDER, marginHorizontal: 0 },
  stepLineDone: { backgroundColor: '#3B6FE8' },

  subtitle: {
    fontSize: s(20),
    color: T1,
    fontWeight: '700',
    marginTop: s(8),
    marginBottom: s(0),
    textAlign: 'center',
  },

  // 폼
  fieldGroup: { gap: s(8) },
  label: { fontSize: s(13), fontWeight: '600', color: T1 },
  input: {
    backgroundColor: SURFACE,
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: s(16),
    paddingVertical: s(14),
    fontSize: s(15),
    color: T1,
  },
  inputError: { borderColor: DANGER },

  // 인증코드 헤더
  codeHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  timer: { fontSize: s(15), fontWeight: '700', color: BLUE },
  timerWarning: { color: DANGER },
  expiredText: { fontSize: s(12), color: DANGER, marginTop: s(2) },
  errorText: { fontSize: s(12), color: DANGER, marginTop: s(2) },

  // 버튼
  primaryBtn: {
    backgroundColor: BLUE,
    borderRadius: s(12),
    paddingVertical: s(18),
    alignItems: 'center',
    marginTop: s(8),
  },
  btnDisabled: { opacity: 0.5 },
  btnGray: { backgroundColor: '#D1D5DB' },
  primaryBtnText: { color: '#fff', fontSize: s(18), fontWeight: '700' },
  resendBtn: { alignItems: 'center', paddingVertical: s(12) },
  resendBtnText: { fontSize: s(15), color: BLUE, fontWeight: '600' },
});
