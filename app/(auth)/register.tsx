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
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';
import type { UserType } from '../../types';

const NATIONALITIES = [
  // 아시아 (동아시아)
  { code: 'CN', flag: '🇨🇳', label: '중국' },
  { code: 'JP', flag: '🇯🇵', label: '일본' },
  { code: 'MN', flag: '🇲🇳', label: '몽골' },
  { code: 'TW', flag: '🇹🇼', label: '대만' },
  { code: 'HK', flag: '🇭🇰', label: '홍콩' },
  // 아시아 (동남아시아)
  { code: 'VN', flag: '🇻🇳', label: '베트남' },
  { code: 'PH', flag: '🇵🇭', label: '필리핀' },
  { code: 'TH', flag: '🇹🇭', label: '태국' },
  { code: 'ID', flag: '🇮🇩', label: '인도네시아' },
  { code: 'MY', flag: '🇲🇾', label: '말레이시아' },
  { code: 'SG', flag: '🇸🇬', label: '싱가포르' },
  { code: 'MM', flag: '🇲🇲', label: '미얀마' },
  { code: 'KH', flag: '🇰🇭', label: '캄보디아' },
  { code: 'LA', flag: '🇱🇦', label: '라오스' },
  // 아시아 (남아시아)
  { code: 'IN', flag: '🇮🇳', label: '인도' },
  { code: 'NP', flag: '🇳🇵', label: '네팔' },
  { code: 'BD', flag: '🇧🇩', label: '방글라데시' },
  { code: 'PK', flag: '🇵🇰', label: '파키스탄' },
  { code: 'LK', flag: '🇱🇰', label: '스리랑카' },
  // 아시아 (중앙아시아)
  { code: 'UZ', flag: '🇺🇿', label: '우즈베키스탄' },
  { code: 'KZ', flag: '🇰🇿', label: '카자흐스탄' },
  { code: 'KG', flag: '🇰🇬', label: '키르기스스탄' },
  { code: 'TJ', flag: '🇹🇯', label: '타지키스탄' },
  { code: 'TM', flag: '🇹🇲', label: '투르크메니스탄' },
  // 아시아 (서아시아/중동)
  { code: 'TR', flag: '🇹🇷', label: '튀르키예' },
  { code: 'IR', flag: '🇮🇷', label: '이란' },
  { code: 'SA', flag: '🇸🇦', label: '사우디아라비아' },
  { code: 'AE', flag: '🇦🇪', label: '아랍에미리트' },
  { code: 'IQ', flag: '🇮🇶', label: '이라크' },
  { code: 'JO', flag: '🇯🇴', label: '요르단' },
  { code: 'IL', flag: '🇮🇱', label: '이스라엘' },
  // 유럽
  { code: 'RU', flag: '🇷🇺', label: '러시아' },
  { code: 'UA', flag: '🇺🇦', label: '우크라이나' },
  { code: 'GB', flag: '🇬🇧', label: '영국' },
  { code: 'FR', flag: '🇫🇷', label: '프랑스' },
  { code: 'DE', flag: '🇩🇪', label: '독일' },
  { code: 'IT', flag: '🇮🇹', label: '이탈리아' },
  { code: 'ES', flag: '🇪🇸', label: '스페인' },
  { code: 'NL', flag: '🇳🇱', label: '네덜란드' },
  { code: 'BE', flag: '🇧🇪', label: '벨기에' },
  { code: 'CH', flag: '🇨🇭', label: '스위스' },
  { code: 'AT', flag: '🇦🇹', label: '오스트리아' },
  { code: 'PL', flag: '🇵🇱', label: '폴란드' },
  { code: 'CZ', flag: '🇨🇿', label: '체코' },
  { code: 'HU', flag: '🇭🇺', label: '헝가리' },
  { code: 'RO', flag: '🇷🇴', label: '루마니아' },
  { code: 'SE', flag: '🇸🇪', label: '스웨덴' },
  { code: 'NO', flag: '🇳🇴', label: '노르웨이' },
  { code: 'DK', flag: '🇩🇰', label: '덴마크' },
  { code: 'FI', flag: '🇫🇮', label: '핀란드' },
  { code: 'PT', flag: '🇵🇹', label: '포르투갈' },
  { code: 'GR', flag: '🇬🇷', label: '그리스' },
  { code: 'AZ', flag: '🇦🇿', label: '아제르바이잔' },
  { code: 'GE', flag: '🇬🇪', label: '조지아' },
  // 북미
  { code: 'US', flag: '🇺🇸', label: '미국' },
  { code: 'CA', flag: '🇨🇦', label: '캐나다' },
  { code: 'MX', flag: '🇲🇽', label: '멕시코' },
  // 남미
  { code: 'BR', flag: '🇧🇷', label: '브라질' },
  { code: 'AR', flag: '🇦🇷', label: '아르헨티나' },
  { code: 'CO', flag: '🇨🇴', label: '콜롬비아' },
  { code: 'CL', flag: '🇨🇱', label: '칠레' },
  { code: 'PE', flag: '🇵🇪', label: '페루' },
  // 오세아니아
  { code: 'AU', flag: '🇦🇺', label: '호주' },
  { code: 'NZ', flag: '🇳🇿', label: '뉴질랜드' },
  // 아프리카
  { code: 'NG', flag: '🇳🇬', label: '나이지리아' },
  { code: 'EG', flag: '🇪🇬', label: '이집트' },
  { code: 'ET', flag: '🇪🇹', label: '에티오피아' },
  { code: 'KE', flag: '🇰🇪', label: '케냐' },
  { code: 'GH', flag: '🇬🇭', label: '가나' },
  { code: 'ZA', flag: '🇿🇦', label: '남아프리카공화국' },
  { code: 'MA', flag: '🇲🇦', label: '모로코' },
  { code: 'TZ', flag: '🇹🇿', label: '탄자니아' },
  { code: 'CM', flag: '🇨🇲', label: '카메룬' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [userType, setUserType] = useState<UserType | null>(null);
  const [nationality, setNationality] = useState<string | null>(null);
  const [showNationalityModal, setShowNationalityModal] = useState(false);

  const selectedNationality = NATIONALITIES.find((n) => n.code === nationality);

  const handleRegister = async () => {
    // 입력 검증
    if (!email.trim() || !password.trim() || !nickname.trim()) {
      Alert.alert('알림', '모든 필드를 입력해주세요.');
      return;
    }
    if (!userType) {
      Alert.alert('알림', '사용자 유형을 선택해주세요.');
      return;
    }
    if (userType === 'INTERNATIONAL' && !nationality) {
      Alert.alert('알림', '국적을 선택해주세요.');
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
      university: '국민대학교',
    });

    if (success) {
      Alert.alert('회원가입 완료', '로그인해주세요.', [
        { text: '확인', onPress: () => router.replace('/(auth)/login') },
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
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}>
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

        {/* 국적 선택 (유학생 선택 시에만 표시) */}
        {userType === 'INTERNATIONAL' && (
          <View style={styles.nationalityContainer}>
            <Text style={styles.label}>국적</Text>
            <TouchableOpacity
              style={styles.nationalitySelector}
              onPress={() => setShowNationalityModal(true)}
            >
              {selectedNationality ? (
                <Text style={styles.nationalitySelectorValue}>
                  {selectedNationality.flag} {selectedNationality.label}
                </Text>
              ) : (
                <Text style={styles.nationalitySelectorPlaceholder}>국적을 선택하세요</Text>
              )}
              <Ionicons name="chevron-down" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        )}

        {/* 국적 선택 모달 */}
        <Modal
          visible={showNationalityModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowNationalityModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowNationalityModal(false)}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>국적 선택</Text>
                <TouchableOpacity onPress={() => setShowNationalityModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={NATIONALITIES}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      nationality === item.code && styles.modalItemActive,
                    ]}
                    onPress={() => {
                      setNationality(item.code);
                      setShowNationalityModal(false);
                    }}
                  >
                    <Text style={styles.modalItemFlag}>{item.flag}</Text>
                    <Text style={[
                      styles.modalItemLabel,
                      nationality === item.code && styles.modalItemLabelActive,
                    ]}>
                      {item.label}
                    </Text>
                    {nationality === item.code && (
                      <Ionicons name="checkmark" size={20} color={Colors.primary} style={styles.modalItemCheck} />
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
              />
            </View>
          </TouchableOpacity>
        </Modal>

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
  nationalityContainer: {
    marginTop: 4,
  },
  nationalitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nationalitySelectorValue: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  nationalitySelectorPlaceholder: {
    fontSize: 16,
    color: Colors.textLight,
  },
  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  modalItemActive: {
    backgroundColor: '#EBF5FF',
  },
  modalItemFlag: {
    fontSize: 22,
  },
  modalItemLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
  modalItemLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  modalItemCheck: {
    marginLeft: 'auto',
  },
  modalDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 56,
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
