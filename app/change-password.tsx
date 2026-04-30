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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendVerificationCode, verifyEmailCode, resetPassword } from '../services/authService';
import { useAuthStore } from '../stores/authStore';
import { s } from '../utils/scale';

const BLUE = '#3B6FE8';
const T1 = '#0C1C3C';
const T2 = '#6B7280';
const BG = '#F8FAFF';
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

  const handleVerifyCode = async () => {
    if (code.trim().length < 4) {
      Alert.alert('알림', '인증코드를 입력해주세요.');
      return;
    }
    if (timeLeft === 0) {
      Alert.alert('알림', '인증 시간이 만료됐습니다. 코드를 재전송해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await verifyEmailCode(email.trim(), code.trim());
      if (res.success) {
        clearInterval(timerRef.current!);
        setTimerActive(false);
        setStep('password');
      } else {
        Alert.alert('오류', '인증코드가 올바르지 않습니다.');
      }
    } catch {
      Alert.alert('오류', '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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
    } catch {
      Alert.alert('오류', '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    email: '비밀번호 재설정',
    code: '인증코드 입력',
    password: '새 비밀번호 설정',
  };

  const stepSubtitles: Record<Step, string> = {
    email: '가입하신 학교 이메일로\n인증코드를 전송합니다.',
    code: `${email}로 전송된\n6자리 코드를 입력해주세요.`,
    password: '새로 사용할 비밀번호를\n입력해주세요.',
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={T1} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{stepTitles[step]}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* 스텝 인디케이터 */}
          <View style={styles.stepRow}>
            {(['email', 'code', 'password'] as Step[]).map((s, i) => (
              <View key={s} style={styles.stepItem}>
                <View style={[styles.stepDot, step === s && styles.stepDotActive,
                  (step === 'code' && s === 'email') || (step === 'password' && s !== 'password') ? styles.stepDotDone : null
                ]}>
                  {((step === 'code' && s === 'email') || (step === 'password' && s !== 'password')) ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : (
                    <Text style={styles.stepDotText}>{i + 1}</Text>
                  )}
                </View>
                {i < 2 && <View style={[styles.stepLine, (step === 'code' && s === 'email') || (step === 'password') ? styles.stepLineDone : null]} />}
              </View>
            ))}
          </View>

          {/* 부제목 */}
          <Text style={styles.subtitle}>{stepSubtitles[step]}</Text>

          {/* Step 1: 이메일 */}
          {step === 'email' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>학교 이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="학교 이메일을 입력하세요"
                placeholderTextColor={T2}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleSendCode}
                disabled={loading}
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
                <Text style={styles.label}>인증코드</Text>
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
                style={[styles.primaryBtn, (loading || timeLeft === 0) && timeLeft !== 0 ? styles.btnDisabled : null, timeLeft === 0 && styles.btnDisabled]}
                onPress={handleVerifyCode}
                disabled={loading || timeLeft === 0}
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
              <Text style={styles.label}>새 비밀번호</Text>
              <TextInput
                style={styles.input}
                placeholder="새 비밀번호 (6자 이상)"
                placeholderTextColor={T2}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <Text style={[styles.label, { marginTop: s(12) }]}>새 비밀번호 확인</Text>
              <TextInput
                style={[
                  styles.input,
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
                style={[styles.primaryBtn, { marginTop: s(20) }, loading && styles.btnDisabled]}
                onPress={handleChangePassword}
                disabled={loading}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingTop: Platform.OS === 'ios' ? s(56) : s(20),
    paddingBottom: s(12),
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { width: s(40), height: s(40), justifyContent: 'center' },
  headerTitle: { fontSize: s(17), fontWeight: '700', color: T1 },

  body: { padding: s(24), gap: s(8) },

  // 스텝 인디케이터
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: s(24) },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: {
    width: s(28), height: s(28), borderRadius: s(14),
    backgroundColor: SURFACE,
    borderWidth: 2, borderColor: BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { borderColor: BLUE },
  stepDotDone: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  stepDotText: { fontSize: s(12), fontWeight: '700', color: T1 },
  stepLine: { flex: 1, height: 2, backgroundColor: BORDER, marginHorizontal: s(4) },
  stepLineDone: { backgroundColor: '#22C55E' },

  subtitle: {
    fontSize: s(14),
    color: T2,
    lineHeight: s(22),
    marginBottom: s(20),
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
  codeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timer: { fontSize: s(15), fontWeight: '700', color: BLUE },
  timerWarning: { color: DANGER },
  expiredText: { fontSize: s(12), color: DANGER, marginTop: s(2) },
  errorText: { fontSize: s(12), color: DANGER, marginTop: s(2) },

  // 버튼
  primaryBtn: {
    backgroundColor: BLUE,
    borderRadius: s(12),
    paddingVertical: s(15),
    alignItems: 'center',
    marginTop: s(8),
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: s(16), fontWeight: '700' },
  resendBtn: { alignItems: 'center', paddingVertical: s(12) },
  resendBtnText: { fontSize: s(13), color: BLUE, fontWeight: '600' },
});
