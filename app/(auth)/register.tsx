// 회원가입 화면
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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';
import type { UserType } from '../../types';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [university, setUniversity] = useState('');
  const [userType, setUserType] = useState<UserType | null>(null);

  const handleRegister = async () => {
    // 입력 검증
    if (!email.trim() || !password.trim() || !nickname.trim() || !university.trim()) {
      Alert.alert('알림', '모든 필드를 입력해주세요.');
      return;
    }
    if (!userType) {
      Alert.alert('알림', '사용자 유형을 선택해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    const success = await register({
      email,
      password,
      nickname,
      userType,
      university,
    });

    if (success) {
      Alert.alert('회원가입 완료', '로그인해주세요.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } else {
      const currentError = useAuthStore.getState().error;
      Alert.alert('회원가입 실패', currentError ?? '회원가입에 실패했습니다.');
      useAuthStore.getState().clearError();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.title}>회원가입</Text>
          <Text style={styles.subtitle}>도와줘코리안에 가입하세요</Text>
        </View>

        {/* 사용자 유형 선택 */}
        <Text style={styles.label}>사용자 유형</Text>
        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              userType === 'INTERNATIONAL' && styles.typeButtonActive,
            ]}
            onPress={() => setUserType('INTERNATIONAL')}
          >
            <Text style={styles.typeEmoji}>🌍</Text>
            <Text
              style={[
                styles.typeText,
                userType === 'INTERNATIONAL' && styles.typeTextActive,
              ]}
            >
              유학생
            </Text>
            <Text style={styles.typeDesc}>도움을 요청합니다</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              userType === 'KOREAN' && styles.typeButtonActive,
            ]}
            onPress={() => setUserType('KOREAN')}
          >
            <Text style={styles.typeEmoji}>🇰🇷</Text>
            <Text
              style={[
                styles.typeText,
                userType === 'KOREAN' && styles.typeTextActive,
              ]}
            >
              한국인 학생
            </Text>
            <Text style={styles.typeDesc}>도움을 제공합니다</Text>
          </TouchableOpacity>
        </View>

        {/* 입력 폼 */}
        <View style={styles.form}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            placeholder="example@university.ac.kr"
            placeholderTextColor={Colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>닉네임</Text>
          <TextInput
            style={styles.input}
            placeholder="닉네임을 입력하세요"
            placeholderTextColor={Colors.textLight}
            value={nickname}
            onChangeText={setNickname}
          />

          <Text style={styles.label}>대학교</Text>
          <TextInput
            style={styles.input}
            placeholder="대학교명을 입력하세요"
            placeholderTextColor={Colors.textLight}
            value={university}
            onChangeText={setUniversity}
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            placeholder="6자 이상 입력하세요"
            placeholderTextColor={Colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>비밀번호 확인</Text>
          <TextInput
            style={styles.input}
            placeholder="비밀번호를 다시 입력하세요"
            placeholderTextColor={Colors.textLight}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.textWhite} />
            ) : (
              <Text style={styles.registerButtonText}>가입하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 32,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  typeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EBF5FF',
  },
  typeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  typeTextActive: {
    color: Colors.primary,
  },
  typeDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  form: {
    marginTop: 8,
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
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: Colors.textWhite,
    fontSize: 18,
    fontWeight: '700',
  },
});
