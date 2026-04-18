import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getBlockedUsers, unblockUser, type UserBlockItem } from '../services/blockService';
import { getInitial } from '../utils/getInitial';
import { s as sc } from '../utils/scale';

const BLUE = '#3B6FE8';
const T1 = '#0C1C3C';
const T2 = '#6B7280';
const BG = '#F0F4FA';
const SURFACE = '#FFFFFF';
const BORDER = '#E5E7EB';
const DANGER = '#EF4444';

const SERVER_BASE_URL = 'https://backend-production-0a6f.up.railway.app';

const AVATAR_COLORS = ['#F0A040', '#F06060', BLUE, '#90C4F0', '#A0A8B0'];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function toAbsoluteUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return SERVER_BASE_URL + path;
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const [blockedList, setBlockedList] = useState<UserBlockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<number | null>(null);

  const fetchBlocked = useCallback(async () => {
    try {
      const res = await getBlockedUsers();
      if (res.success) setBlockedList(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);

  const handleUnblock = (item: UserBlockItem) => {
    Alert.alert('차단 해제', `${item.blockedUser.nickname}님의 차단을 해제하시겠어요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '해제',
        onPress: async () => {
          setUnblockingId(item.blockedUser.id);
          try {
            await unblockUser(item.blockedUser.id);
            setBlockedList((prev) => prev.filter((b) => b.id !== item.id));
          } catch {
            Alert.alert('오류', '차단 해제에 실패했습니다.');
          } finally {
            setUnblockingId(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={T1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>차단 관리</Text>
        <View style={{ width: sc(40) }} />
      </View>

      {loading ? (
        <ActivityIndicator color={BLUE} style={{ marginTop: 60 }} />
      ) : blockedList.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="ban-outline" size={48} color={T2} />
          <Text style={styles.emptyText}>차단한 사용자가 없어요</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {blockedList.map((item) => {
            const profileUri = toAbsoluteUrl(item.blockedUser.profileImage);
            const isUnblocking = unblockingId === item.blockedUser.id;
            return (
              <View key={item.id} style={styles.card}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/user-profile', params: { id: item.blockedUser.id } })}
                  style={styles.cardLeft}
                >
                  {profileUri ? (
                    <Image source={{ uri: profileUri }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: avatarColor(item.blockedUser.nickname) }]}>
                      <Text style={styles.avatarInitial}>{getInitial(item.blockedUser.nickname)}</Text>
                    </View>
                  )}
                  <Text style={styles.nickname}>{item.blockedUser.nickname}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unblockBtn, isUnblocking && { opacity: 0.6 }]}
                  activeOpacity={0.8}
                  disabled={isUnblocking}
                  onPress={() => handleUnblock(item)}
                >
                  {isUnblocking ? (
                    <ActivityIndicator size="small" color={DANGER} />
                  ) : (
                    <Text style={styles.unblockBtnText}>차단해제</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sc(16),
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: sc(12),
    backgroundColor: SURFACE,
    borderBottomWidth: sc(1),
    borderBottomColor: BORDER,
  },
  backBtn: { width: sc(40), height: sc(40), justifyContent: 'center' },
  headerTitle: { fontSize: sc(17), fontWeight: '700', color: T1 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: sc(12) },
  emptyText: { fontSize: sc(15), color: T2 },
  list: { padding: sc(16), gap: sc(10) },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: sc(14),
    paddingHorizontal: sc(16),
    paddingVertical: sc(14),
    borderWidth: sc(1),
    borderColor: BORDER,
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: sc(12) },
  avatar: { width: sc(44), height: sc(44), borderRadius: sc(22), justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#fff', fontSize: sc(18), fontWeight: '700' },
  nickname: { fontSize: sc(15), fontWeight: '600', color: T1 },
  unblockBtn: {
    paddingHorizontal: sc(14),
    paddingVertical: sc(8),
    borderRadius: sc(8),
    borderWidth: sc(1),
    borderColor: DANGER,
    minWidth: sc(70),
    alignItems: 'center',
  },
  unblockBtnText: { fontSize: sc(13), fontWeight: '600', color: DANGER },
});
