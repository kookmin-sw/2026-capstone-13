import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { deleteAccount } from '../services/authService';
import { useAuthStore } from '../stores/authStore';

const PRIMARY = '#3B6FE8';
const DANGER = '#EF4444';
const T1 = '#0C1C3C';
const T2 = '#6B7280';
const BG = '#F0F4FA';
const SURFACE = '#FFFFFF';
const BORDER = '#E5E7EB';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();

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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 12,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: T1,
  },
  section: {
    backgroundColor: SURFACE,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: DANGER,
  },
  menuChevron: {
    marginLeft: 'auto',
  },
  withdrawBox: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: 16,
    gap: 12,
  },
  withdrawDesc: {
    fontSize: 13,
    color: T2,
    lineHeight: 20,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
  },
  withdrawLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: T1,
    marginTop: 4,
  },
  passwordInput: {
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: T1,
  },
  withdrawBtn: {
    backgroundColor: DANGER,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  withdrawBtnDisabled: {
    opacity: 0.6,
  },
  withdrawBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
