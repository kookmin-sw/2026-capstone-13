// 마이페이지 화면
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃', style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const MENU_ITEMS = [
    { icon: 'document-text-outline', label: '내 도움 요청' },
    { icon: 'star-outline', label: '후기 관리' },
    { icon: 'settings-outline', label: '설정' },
  ] as const;

  return (
    <View style={styles.container}>
      {/* 프로필 카드 */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.nickname?.charAt(0) ?? '?'}</Text>
        </View>
        <Text style={styles.nickname}>{user?.nickname ?? '사용자'}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {user?.userType === 'INTERNATIONAL' ? '🌍 유학생' : '🇰🇷 한국인 학생'}
          </Text>
        </View>
        <Text style={styles.university}>{user?.university ?? '국민대학교'}</Text>

        {/* 통계 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.rating?.toFixed(1) ?? '0.0'}</Text>
            <Text style={styles.statLabel}>평점</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.helpCount ?? 0}</Text>
            <Text style={styles.statLabel}>도움 횟수</Text>
          </View>
        </View>
      </View>

      {/* 메뉴 */}
      <View style={styles.menuCard}>
        {MENU_ITEMS.map((item, idx) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, idx < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconWrap}>
              <Ionicons name={item.icon} size={18} color={PRIMARY} />
            </View>
            <Text style={styles.menuText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>
        ))}
      </View>

      {/* 로그아웃 */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F8' },

  profileCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.06)',
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  nickname: { fontSize: 22, fontWeight: '800', color: '#1E1B4B', marginBottom: 6 },
  typeBadge: {
    backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, marginBottom: 6,
  },
  typeBadgeText: { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  university: { fontSize: 13, color: '#9CA3AF', marginBottom: 18 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#1E1B4B' },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(79,70,229,0.1)' },

  menuCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.06)',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15, gap: 12,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(79,70,229,0.08)' },
  menuIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  menuText: { flex: 1, fontSize: 15, color: '#1E1B4B', fontWeight: '500' },

  logoutButton: {
    marginHorizontal: 16, marginTop: 16,
    padding: 15, borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
