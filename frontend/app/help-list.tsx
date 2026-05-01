import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { getInitial } from '../utils/getInitial';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { s as sc } from '../utils/scale';
import { CategoryLabels } from '../constants/colors';
import { cancelHelpRequest, getHelpRequests } from '../services/helpService';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import type { HelpCategory, HelpRequest } from '../types';

const SERVER_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-0a6f.up.railway.app/api').replace('/api', '');
const toAbsoluteUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url.startsWith('content://')) return url;
  return SERVER_BASE_URL + url;
};

const BLUE   = '#3B6FE8';
const BLUE_L = '#EEF4FF';
const ORANGE = '#F97316';
const T1     = '#0C1C3C';
const T2     = '#AABBCC';
const BG     = '#FFFFFF';
const DIV    = '#F4F5F8';

const CAT_AVATAR_COLOR: Record<HelpCategory, string> = {
  BANK: '#F0A040', HOSPITAL: '#F06060', SCHOOL: BLUE, DAILY: '#90C4F0', OTHER: '#A0A8B0',
};

function parseUTC(iso: string): number {
  const utc = iso.includes('Z') || iso.includes('+') ? iso : iso + 'Z';
  return new Date(utc.replace(/\.(\d+)Z/, (_, d) => '.' + (d + '000').slice(0, 3) + 'Z')).getTime();
}
function isUrgent(createdAt: string) {
  return Date.now() - parseUTC(createdAt) > 2 * 60 * 60 * 1000;
}
function formatTime(iso: string) {
  const ms = parseUTC(iso);
  if (isNaN(ms)) return '';
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

type StatusFilter = 'ALL' | 'WAITING' | 'COMPLETED' | 'URGENT';
type CatFilter = 'ALL' | HelpCategory;

export default function HelpListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { hasLeft } = useChatStore();
  const [requests, setRequests]     = useState<HelpRequest[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catFilter]                 = useState<CatFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const fetchRequests = useCallback(async () => {
    try {
      const res = await getHelpRequests();
      if (res.success) setRequests(res.data);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchRequests(); }, [fetchRequests]));

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const goTo = (item: HelpRequest) =>
    router.push({ pathname: '/request-detail', params: { id: item.id } });

  const handleDelete = (item: HelpRequest) => {
    Alert.alert('도움 요청 삭제', '이 도움 요청을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await cancelHelpRequest(item.id);
            setRequests(prev => prev.filter(r => r.id !== item.id));
          } catch {
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const filtered = requests
    .filter(r => r.status !== 'CANCELLED')
    .map(r => {
      if ((r.status === 'MATCHED' || r.status === 'IN_PROGRESS') && hasLeft(r.id, user?.id ?? 0)) {
        return { ...r, status: 'WAITING' as HelpRequest['status'] };
      }
      return r;
    })
    .filter(r => catFilter === 'ALL' || r.category === catFilter)
    .filter(r => {
      if (statusFilter === 'WAITING')   return r.status === 'WAITING' || r.status === 'IN_PROGRESS' || r.status === 'MATCHED';
      if (statusFilter === 'COMPLETED') return r.status === 'COMPLETED';
      if (statusFilter === 'URGENT')    return r.status === 'WAITING' && isUrgent(r.createdAt);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const renderCard = (item: HelpRequest) => {
    const initial  = getInitial(item.requester.nickname);
    const avatarBg = CAT_AVATAR_COLOR[item.category];
    const profileImageUrl = toAbsoluteUrl(item.requester.profileImage);
    return (
      <TouchableOpacity key={item.id} style={s.card} onPress={() => goTo(item)} activeOpacity={0.85}>
        <View style={[s.cardBar, {
          backgroundColor:
            item.status === 'COMPLETED' ? '#E5E7EB' :
            item.status === 'IN_PROGRESS' || item.status === 'MATCHED' ? '#FED7AA' :
            '#BBF7D0',
        }]} />
        <View style={s.cardContent}>
          <View style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <View style={s.catBadge}>
                <Text style={s.catBadgeText}>
                  {CategoryLabels[item.category].replace(/\S+\s/, '')}
                </Text>
              </View>
              <Text style={s.timeText}>{formatTime(item.createdAt)}</Text>
            </View>
            <View style={[s.statusBadge, {
              backgroundColor:
                item.status === 'COMPLETED' ? '#F3F4F6' :
                item.status === 'IN_PROGRESS' || item.status === 'MATCHED' ? '#FFF3E8' : '#D1FAE5',
            }]}>
              <Text style={[s.statusText, {
                color:
                  item.status === 'COMPLETED' ? '#9CA3AF' :
                  item.status === 'IN_PROGRESS' || item.status === 'MATCHED' ? '#C45A10' : '#065F46',
              }]}>
                {item.status === 'COMPLETED' ? '모집완료' :
                 item.status === 'IN_PROGRESS' ? '진행중' :
                 item.status === 'MATCHED' ? '대기중' : '모집중'}
              </Text>
            </View>
          </View>
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={s.cardFooter}>
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={s.avatarImg} />
            ) : (
              <View style={[s.avatar, { backgroundColor: avatarBg }]}>
                <Text style={s.avatarText}>{initial}</Text>
              </View>
            )}
            <Text style={s.schoolText}>{item.requester.nickname} · 국민대</Text>
            {item.status === 'WAITING' && user?.userType === 'KOREAN' && (
              <TouchableOpacity style={s.helpBtn} onPress={() => goTo(item)} activeOpacity={0.8}>
                <Text style={s.helpBtnText}>도와주기</Text>
              </TouchableOpacity>
            )}
            {item.requester.id === user?.id && item.status === 'WAITING' && (
              <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={T1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>도움 요청 목록</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 필터 */}
      <View style={s.filterRow}>
        {(['ALL', 'WAITING', 'COMPLETED', 'URGENT'] as const).map(key => (
          <TouchableOpacity
            key={key}
            style={[s.chip, statusFilter === key && (key === 'URGENT' ? s.chipUrgent : s.chipOn)]}
            onPress={() => setStatusFilter(key)}
            activeOpacity={0.8}
          >
            <Text style={[s.chipText, statusFilter === key && s.chipTextOn]}>
              {key === 'ALL' ? '전체' : key === 'WAITING' ? '모집중' : key === 'COMPLETED' ? '모집완료' : '긴급'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        contentContainerStyle={s.listContent}
      >
        {isLoading ? (
          <View style={s.center}><ActivityIndicator size="large" color={BLUE} /></View>
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📋</Text>
            <Text style={s.emptyTitle}>해당하는 요청이 없어요</Text>
            <Text style={s.emptySub}>다른 필터를 선택해보세요</Text>
          </View>
        ) : (
          <View style={s.cardList}>
            {filtered.map(renderCard)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // 헤더
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingBottom: sc(12),
    paddingHorizontal: sc(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BG,
    borderBottomWidth: sc(1),
    borderBottomColor: DIV,
  },
  backBtn: {
    width: sc(36), height: sc(36), borderRadius: sc(10),
    backgroundColor: '#F4F5F8',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: sc(17), fontWeight: '800', color: T1 },

  // 필터
  filterRow: { flexDirection: 'row', gap: sc(6), padding: sc(16), paddingBottom: sc(8) },
  chip: {
    paddingHorizontal: sc(16), paddingVertical: sc(8),
    borderRadius: sc(20), backgroundColor: '#F4F5F8',
  },
  chipOn:     { backgroundColor: BLUE },
  chipUrgent: { backgroundColor: ORANGE },
  chipText:   { fontSize: sc(13), fontWeight: '700', color: '#888' },
  chipTextOn: { color: '#fff' },

  // 리스트
  listContent: { paddingBottom: sc(40) },
  cardList:    { gap: 0, paddingHorizontal: sc(16), paddingTop: sc(8) },

  center: { paddingVertical: sc(60), alignItems: 'center' },
  empty:  { alignItems: 'center', paddingVertical: sc(60), gap: sc(8) },
  emptyEmoji: { fontSize: 40, marginBottom: sc(4) },
  emptyTitle: { fontSize: sc(16), fontWeight: '700', color: T1 },
  emptySub:   { fontSize: sc(14), color: T2 },

  // 카드
  card: {
    backgroundColor: '#fff',
    borderRadius: sc(16),
    borderWidth: sc(1), borderColor: '#F0F2F6',
    flexDirection: 'row', marginBottom: sc(10),
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(1) },
    shadowOpacity: 0.05, shadowRadius: sc(4), elevation: 2,
  },
  cardBar:        { width: sc(5), flexShrink: 0 },
  cardContent:    { flex: 1, paddingHorizontal: sc(14), paddingVertical: sc(12) },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sc(8) },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: sc(8) },
  catBadge:       { backgroundColor: BLUE_L, paddingHorizontal: sc(9), paddingVertical: sc(3), borderRadius: sc(7) },
  catBadgeText:   { fontSize: sc(12), fontWeight: '800', color: BLUE },
  timeText:       { fontSize: sc(12), color: T2 },
  statusBadge:    { paddingHorizontal: sc(10), paddingVertical: sc(4), borderRadius: sc(8) },
  statusText:     { fontSize: sc(12), fontWeight: '700' },
  cardTitle:      { fontSize: sc(16), fontWeight: '700', color: T1, lineHeight: sc(22), marginBottom: sc(10) },
  cardFooter:     { flexDirection: 'row', alignItems: 'center', gap: sc(6) },
  avatar: {
    width: sc(22), height: sc(22), borderRadius: sc(11),
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarImg:  { width: sc(22), height: sc(22), borderRadius: sc(11), flexShrink: 0 },
  avatarText: { fontSize: sc(10), color: '#fff', fontWeight: '700' },
  schoolText: { fontSize: sc(13), color: T2, fontWeight: '500', flex: 1 },
  helpBtn: {
    backgroundColor: BLUE_L, borderRadius: sc(8),
    paddingHorizontal: sc(12), paddingVertical: sc(5),
  },
  helpBtnText: { fontSize: sc(12), fontWeight: '700', color: BLUE },
  deleteBtn: {
    width: sc(28), height: sc(28), borderRadius: sc(8),
    backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center',
  },
});
