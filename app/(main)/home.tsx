import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import SwipeCardStack from '../../components/SwipeCardStack';
import { CategoryLabels } from '../../constants/colors';
import { cancelHelpRequest, getHelpedRequests, getHelpRequests } from '../../services/helpService';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useNotificationStore } from '../../stores/notificationStore';
import type { HelpCategory, HelpRequest } from '../../types';

const SERVER_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-0a6f.up.railway.app/api').replace('/api', '');
const toAbsoluteUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url.startsWith('content://')) return url;
  return SERVER_BASE_URL + url;
};

// ── Design tokens ──
const BLUE   = '#3B6FE8';
const BLUE_L = '#EEF4FF';
const ORANGE = '#F97316';
const T1     = '#0C1C3C';
const T2     = '#AABBCC';
const BG     = '#EDEEF2';
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

const HELP_GOAL = 20;

function getLevel(count: number): { label: string; color: string; bg: string } {
  if (count >= 31) return { label: '마스터', color: '#F97316', bg: '#FFF7ED' };
  if (count >= 16) return { label: '전문가', color: '#8B5CF6', bg: '#F5F3FF' };
  if (count >= 6)  return { label: '도우미', color: '#3B6FE8', bg: '#EEF4FF' };
  return                  { label: '새싹',   color: '#22C55E', bg: '#F0FDF4' };
}

type StatusFilter = 'ALL' | 'WAITING' | 'COMPLETED' | 'URGENT';
type CatFilter = 'ALL' | HelpCategory;


export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { hasUnreadForUser } = useNotificationStore();
  const { hasLeft } = useChatStore();
  const [requests, setRequests]             = useState<HelpRequest[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [showCount, setShowCount] = useState(false);
  const [isLoading, setIsLoading]           = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [catFilter]                          = useState<CatFilter>('ALL');
  const [statusFilter, setStatusFilter]     = useState<StatusFilter>('ALL');
  const [scrollEnabled, setScrollEnabled]   = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setShowCount(prev => !prev), 6000);
    return () => clearInterval(timer);
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const [reqRes, helpedRes] = await Promise.allSettled([
        getHelpRequests(),
        getHelpedRequests(),
      ]);
      if (reqRes.status === 'fulfilled' && reqRes.value.success) setRequests(reqRes.value.data);
      if (helpedRes.status === 'fulfilled' && helpedRes.value.success) {
        setCompletedCount(helpedRes.value.data.filter((r: HelpRequest) => r.status === 'COMPLETED').length);
      }
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchRequests(); }, [fetchRequests]));

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const activeCount = requests.filter(r =>
    r.status !== 'CANCELLED' &&
    (r.status === 'WAITING' ||
      ((r.status === 'MATCHED' || r.status === 'IN_PROGRESS') && !hasLeft(r.id, user?.id ?? 0)))
  ).length;

  const rating = (user as { rating?: number })?.rating ?? 0;

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

  const renderCard = (item: HelpRequest) => {
    const initial  = item.requester.nickname.charAt(0);
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
      {user?.userType !== 'KOREAN' && (
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push('/(main)/write')}
          activeOpacity={0.85}
        >
          <Text style={s.fabText}>도움 요청하기</Text>
        </TouchableOpacity>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── NAV ── */}
        <View style={s.nav}>
          <View style={s.navLeft}>
            <Text style={s.navGreeting}>
              안녕하세요, <Text style={s.navGreetingName}>{user?.nickname ?? ''}님</Text>!
            </Text>
          </View>
          <View style={s.navRight}>
            <TouchableOpacity style={s.notifBtn} onPress={() => router.push('/notifications')} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={20} color="#444" />
              {hasUnreadForUser(user?.id ?? 0) && <View style={s.notifDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Hero 카드 ── */}
        <View style={s.heroWrap}>
          <View style={s.heroCard}>
            <View style={s.heroBg}>
<View style={s.heroTextWrap}>
                <View style={s.heroLocationRow}>
                  <View style={s.heroDot} />
                  <Text style={s.heroLocation}>국민대학교 · 지금 활동중</Text>
                </View>
                <Text style={s.heroTitle}>
                  지금 <Text style={s.heroHL}>{activeCount}명</Text>이{'\n'}기다려요!
                </Text>
                <Text style={s.heroSub}>평균 매칭 2분</Text>
              </View>
            </View>
            <View style={s.heroBottom}>
              <View style={s.heroProgressLabelRow}>
                <Text style={s.heroProgressLabel}>이번달 도움 목표</Text>
                <Text style={s.heroProgressValue}>{completedCount} / {HELP_GOAL}</Text>
              </View>
              <View style={s.heroProgressTrack}>
                <View style={[s.heroProgressFill, { width: `${Math.min((completedCount / HELP_GOAL) * 100, 100)}%` }]} />
              </View>
            </View>
          </View>
        </View>

        {/* ── 모든 도움 보기 ── */}
        <SwipeCardStack onSwipeActive={(active) => setScrollEnabled(!active)} />

        {/* ── 내 활동 확인하기 ── */}
        <View style={s.sectionCard}>
          <View style={s.activityHeader}>
            <View>
              <Text style={s.sectionTitle}>내 활동 확인하기</Text>
            </View>
            {(() => { const lv = getLevel(completedCount); return (
              <View style={[s.levelBadge, { backgroundColor: lv.bg, borderColor: lv.color }]}>
                <Text style={[s.levelBadgeText, { color: lv.color }]}>
                  {showCount ? `${completedCount}회` : lv.label}
                </Text>
              </View>
            ); })()}
          </View>
          <View style={s.ratingRow}>
            <Text style={s.ratingNum}>{rating.toFixed(1)}</Text>
            <View>
              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Ionicons key={i} name="star" size={20} color={i <= Math.round(rating) ? '#FBBF24' : '#E5E7EB'} />
                ))}
              </View>
            </View>
          </View>
          <View style={s.activityShortcuts}>
            <TouchableOpacity style={s.shortcut} onPress={() => router.push('/(main)/mypage' as never)} activeOpacity={0.8}>
              <Text style={s.shortcutLabel}>프로필</Text>
            </TouchableOpacity>
            <View style={s.shortcutDivider} />
            <TouchableOpacity style={s.shortcut} activeOpacity={0.8}>
              <Text style={s.shortcutLabel}>후기 보기</Text>
            </TouchableOpacity>
            <View style={s.shortcutDivider} />
            <TouchableOpacity style={s.shortcut} activeOpacity={0.8}>
              <Text style={s.shortcutLabel}>활동 내역</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 도움 요청 목록 ── */}
        <View style={s.sectionCard}>
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
          <View style={s.cardList}>
            {isLoading ? (
              <View style={s.center}><ActivityIndicator size="large" color={BLUE} /></View>
            ) : filtered.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>📋</Text>
                <Text style={s.emptyTitle}>해당하는 요청이 없어요</Text>
                <Text style={s.emptySub}>다른 필터를 선택해보세요</Text>
              </View>
            ) : (
              filtered.map(renderCard)
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center:    { paddingVertical: 60, alignItems: 'center' },

  // ── NAV ──
  nav: {
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BG,
  },
  navLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navRight:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navGridBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#E2E3E8',
    justifyContent: 'center', alignItems: 'center',
  },
  navTitle:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  navTitleText:     { fontSize: 15, fontWeight: '700', color: T1 },
  navGreeting:      { fontSize: 20, fontWeight: '900', color: T1, letterSpacing: -0.5 },
  navGreetingName:  { color: BLUE },
  matchBtn: {
    backgroundColor: '#E2E3E8',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7,
  },
  matchBtnText: { fontSize: 13, fontWeight: '700', color: '#333' },
  notifBtn:     { position: 'relative', width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  notifDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: ORANGE, borderWidth: 1.5, borderColor: BG,
  },

  // ── Hero ──
  heroWrap: { marginHorizontal: 16, marginBottom: 10 },
  heroCard: {
    backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  heroBg: {
    backgroundColor: '#EEF4FF',
    padding: 26,
    position: 'relative', minHeight: 160,
  },
  heroIconCard: {
    position: 'absolute', top: 14, right: 18,
    width: 82, height: 82,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', gap: 4,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
  },
  heroIconEmoji: { fontSize: 34, lineHeight: 40 },
  heroIconLabel: { fontSize: 9, fontWeight: '700', color: BLUE },
  heroTextWrap:  { maxWidth: 210 },
  heroLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  heroDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  heroLocation: { fontSize: 12, color: '#6B9DF0', fontWeight: '600' },
  heroTitle:  { fontSize: 28, fontWeight: '900', color: T1, lineHeight: 34, letterSpacing: -1, marginBottom: 8 },
  heroHL:     { color: BLUE },
  heroSub:    { fontSize: 12, color: T2, fontWeight: '500' },
  heroUrgent: { fontSize: 12, color: ORANGE, fontWeight: '700', marginTop: 4 },
  heroBottom: { padding: 16, paddingTop: 14 },
  heroBtn: {
    backgroundColor: BLUE, borderRadius: 14, padding: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  heroBtnText:          { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  heroProgressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  heroProgressLabel:    { fontSize: 12, color: '#6B9DF0', fontWeight: '500' },
  heroProgressValue:    { fontSize: 12, color: BLUE, fontWeight: '700' },
  heroProgressTrack:    { backgroundColor: '#D4E4FA', borderRadius: 10, height: 7, overflow: 'hidden' },
  heroProgressFill:     { backgroundColor: BLUE, borderRadius: 10, height: '100%' },

  // ── Section Card ──
  sectionCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  sectionHeader: {
    padding: 18, paddingBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: DIV,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: T1 },

  // ── 카테고리 ──
  catGrid: {
    flexDirection: 'row',
    padding: 16, paddingBottom: 0,
    justifyContent: 'space-between',
  },
  catItem:    { alignItems: 'center', gap: 7 },
  catIcon: {
    width: 48, height: 48, borderRadius: 15,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  catIconOn:  { backgroundColor: BLUE },
  catEmoji:   { fontSize: 22 },
  catLabel:   { fontSize: 11, fontWeight: '600', color: '#333' },
  catLabelOn: { color: BLUE, fontWeight: '800' },

  sectionFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: DIV,
    padding: 14, paddingHorizontal: 20, marginTop: 14,
  },
  sectionCount:    { fontSize: 24, fontWeight: '900', color: T1, letterSpacing: -0.8 },
  sectionCountSub: { fontSize: 12, color: T2, marginTop: 2 },
  historyBtn: {
    backgroundColor: '#EDEEF2', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  historyBtnText: { fontSize: 12, fontWeight: '700', color: '#555' },

  // ── 내 활동 ──
  activityHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 14, paddingBottom: 10,
  },
  activitySub: { fontSize: 12, color: T2, marginTop: 3 },
  nuanceBadge: {
    backgroundColor: '#FFF3E0', borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 5,
  },
  nuanceBadgeText: { fontSize: 11, fontWeight: '800', color: ORANGE },
  levelBadge:     { borderRadius: 10, borderWidth: 1.5, width: 58, height: 32, alignItems: 'center', justifyContent: 'center' },
  levelBadgeText: { fontSize: 13, fontWeight: '800' },
  ratingRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    paddingHorizontal: 14, marginBottom: 10,
  },
  ratingNum:  { fontSize: 44, fontWeight: '900', color: T1, letterSpacing: -2, lineHeight: 44 },
  starsRow:   { flexDirection: 'row', gap: 3, marginBottom: 5 },
  ratingSub:  { fontSize: 11, color: T2 },
  progressTrack: {
    height: 6, borderRadius: 6,
    backgroundColor: '#F0F2F6',
    marginHorizontal: 18, marginBottom: 18, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: BLUE, borderRadius: 6 },
  activityShortcuts: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: DIV,
    paddingTop: 10, paddingBottom: 12, paddingHorizontal: 10,
  },
  shortcut:      { flex: 1, alignItems: 'center', gap: 6 },
  shortcutIcon: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  shortcutLabel:   { fontSize: 11, fontWeight: '600', color: '#333' },
  shortcutDivider: { width: 1, backgroundColor: DIV, alignSelf: 'stretch', marginTop: -16, marginBottom: -18 },

  // ── 필터 & 카드 ──
  filterRow: { flexDirection: 'row', gap: 6, padding: 16, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F4F5F8',
  },
  chipOn:     { backgroundColor: BLUE },
  chipUrgent: { backgroundColor: ORANGE },
  chipText:   { fontSize: 13, fontWeight: '700', color: '#888' },
  chipTextOn: { color: '#fff' },
  cardList:   { gap: 0, paddingHorizontal: 16, paddingBottom: 16 },

  // ── Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F0F2F6',
    flexDirection: 'row', marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardBar:        { width: 5, flexShrink: 0 },
  cardContent:    { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge:       { backgroundColor: BLUE_L, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  catBadgeText:   { fontSize: 12, fontWeight: '800', color: BLUE },
  timeText:       { fontSize: 12, color: T2 },
  statusBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText:     { fontSize: 12, fontWeight: '700' },
  cardTitle:      { fontSize: 16, fontWeight: '700', color: T1, lineHeight: 22, marginBottom: 10 },
  cardFooter:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarImg:   { width: 22, height: 22, borderRadius: 11, flexShrink: 0 },
  avatarText:  { fontSize: 10, color: '#fff', fontWeight: '700' },
  schoolText:  { fontSize: 13, color: T2, fontWeight: '500', flex: 1 },
  helpBtn: {
    backgroundColor: BLUE_L, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  helpBtnText: { fontSize: 12, fontWeight: '700', color: BLUE },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center',
  },

  // ── FAB ──
  fab: {
    position: 'absolute', bottom: 16, right: 20,
    borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
    zIndex: 10,
  },
  fabText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // ── Empty ──
  empty:      { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T1 },
  emptySub:   { fontSize: 14, color: T2 },
});
