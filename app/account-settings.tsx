import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { deleteAccount } from '../services/authService';
import { useAuthStore } from '../stores/authStore';
import { s } from '../utils/scale';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, LANGUAGE_FLAGS, type SupportedLanguage } from '../i18n';

const PRIMARY = '#3B6FE8';
const DANGER = '#EF4444';
const T1 = '#0C1C3C';
const T2 = '#6B7280';
const BG = '#F0F4FA';
const SURFACE = '#FFFFFF';
const BORDER = '#E5E7EB';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { logout, user, setAppLanguage } = useAuthStore();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const currentLang = (user?.preferredLanguage as SupportedLanguage | undefined) ?? 'ko';

  const handleLanguageSelect = async (lang: SupportedLanguage) => {
    setLangModalVisible(false);
    await setAppLanguage(lang);
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleWithdraw = () => {
    if (!password.trim()) {
      Alert.alert('알림', '비밀번호를 입력해주세요.');
      return;
    }
    Alert.alert(
      '정말 탈퇴하시겠습니까?',
      '탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: confirmWithdraw,
        },
      ]
    );
  };

  const confirmWithdraw = async () => {
    setLoading(true);
    try {
      await deleteAccount(password.trim());
      await logout();
      router.replace('/');
    } catch {
      Alert.alert('탈퇴 실패', '비밀번호가 올바르지 않거나 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={T1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>계정 설정</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 계정 관리 섹션 */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setLangModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="language-outline" size={20} color={T1} />
          <Text style={[styles.menuItemText, { color: T1 }]}>언어 설정</Text>
          <Text style={styles.menuItemValue}>
            {LANGUAGE_FLAGS[currentLang]} {LANGUAGE_LABELS[currentLang]}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={T2} style={styles.menuChevron} />
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/change-password')}
          activeOpacity={0.7}
        >
          <Ionicons name="lock-closed-outline" size={20} color={T1} />
          <Text style={[styles.menuItemText, { color: T1 }]}>비밀번호 변경</Text>
          <Ionicons name="chevron-forward" size={18} color={T2} style={styles.menuChevron} />
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/blocked-users')}
          activeOpacity={0.7}
        >
          <Ionicons name="ban-outline" size={20} color={T1} />
          <Text style={[styles.menuItemText, { color: T1 }]}>차단 관리</Text>
          <Ionicons name="chevron-forward" size={18} color={T2} style={styles.menuChevron} />
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={T1} />
          <Text style={[styles.menuItemText, { color: T1 }]}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 언어 선택 모달 */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.langModalOverlay}
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}
        >
          <View style={styles.langModalSheet}>
            <View style={styles.langModalHeader}>
              <Text style={styles.langModalTitle}>언어 선택</Text>
              <TouchableOpacity onPress={() => setLangModalVisible(false)}>
                <Ionicons name="close" size={24} color={T1} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = currentLang === item;
                return (
                  <TouchableOpacity
                    style={[styles.langItem, isSelected && styles.langItemSelected]}
                    onPress={() => handleLanguageSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.langFlag}>{LANGUAGE_FLAGS[item]}</Text>
                    <Text style={[styles.langLabel, isSelected && styles.langLabelSelected]}>
                      {LANGUAGE_LABELS[item]}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={PRIMARY} />}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.langDivider} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 탈퇴 섹션 */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setShowConfirm((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons name="person-remove-outline" size={20} color={DANGER} />
          <Text style={styles.menuItemText}>계정 탈퇴</Text>
          <Ionicons
            name={showConfirm ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={T2}
            style={styles.menuChevron}
          />
        </TouchableOpacity>

        {showConfirm && (
          <View style={styles.withdrawBox}>
            <Text style={styles.withdrawDesc}>
              탈퇴 시 모든 데이터(도움 내역, 채팅, 게시글 등)가 영구 삭제되며 복구할 수 없습니다.
            </Text>
            <Text style={styles.withdrawLabel}>비밀번호 확인</Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="현재 비밀번호를 입력하세요"
              placeholderTextColor={T2}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.withdrawBtn, loading && styles.withdrawBtnDisabled]}
              onPress={handleWithdraw}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.withdrawBtnText}>탈퇴하기</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: s(12),
    backgroundColor: SURFACE,
    borderBottomWidth: s(1),
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: s(40),
    height: s(40),
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: s(17),
    fontWeight: '700',
    color: T1,
  },
  section: {
    backgroundColor: SURFACE,
    marginTop: s(16),
    marginHorizontal: s(16),
    borderRadius: s(14),
    overflow: 'hidden',
    borderWidth: s(1),
    borderColor: BORDER,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(16),
    paddingVertical: s(16),
    gap: s(12),
  },
  menuItemText: {
    flex: 1,
    fontSize: s(15),
    fontWeight: '600',
    color: DANGER,
  },
  menuChevron: {
    marginLeft: 'auto',
  },
  menuDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: s(16),
  },
  withdrawBox: {
    borderTopWidth: s(1),
    borderTopColor: BORDER,
    padding: s(16),
    gap: s(12),
  },
  withdrawDesc: {
    fontSize: s(13),
    color: T2,
    lineHeight: s(20),
    backgroundColor: '#FEF2F2',
    padding: s(12),
    borderRadius: s(8),
  },
  withdrawLabel: {
    fontSize: s(13),
    fontWeight: '600',
    color: T1,
    marginTop: s(4),
  },
  passwordInput: {
    backgroundColor: BG,
    borderRadius: s(10),
    borderWidth: s(1),
    borderColor: BORDER,
    paddingHorizontal: s(14),
    paddingVertical: s(12),
    fontSize: s(15),
    color: T1,
  },
  withdrawBtn: {
    backgroundColor: DANGER,
    borderRadius: s(10),
    paddingVertical: s(14),
    alignItems: 'center',
    marginTop: s(4),
  },
  withdrawBtnDisabled: {
    opacity: 0.6,
  },
  withdrawBtnText: {
    color: '#fff',
    fontSize: s(15),
    fontWeight: '700',
  },
  menuItemValue: {
    fontSize: s(13),
    color: T2,
    marginRight: s(4),
  },
  langModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  langModalSheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: s(20),
    borderTopRightRadius: s(20),
    maxHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? s(32) : s(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  langModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: s(20),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  langModalTitle: {
    fontSize: s(17),
    fontWeight: '700',
    color: T1,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(20),
    paddingVertical: s(14),
    gap: s(12),
  },
  langItemSelected: {
    backgroundColor: '#EEF4FF',
  },
  langFlag: {
    fontSize: s(22),
  },
  langLabel: {
    flex: 1,
    fontSize: s(16),
    color: T1,
  },
  langLabelSelected: {
    color: PRIMARY,
    fontWeight: '700',
  },
  langDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginLeft: s(56),
  },
});
