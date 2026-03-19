import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getHelpRequests } from '../../services/helpService';
import { useAuthStore } from '../../stores/authStore';
import type { HelpCategory, HelpRequest } from '../../types';

// ── Design tokens ──
const BLUE     = '#3B6FE8';
const BLUE_BG  = '#F5F8FF';
const BLUE_L   = '#EEF4FF';
const BLUE_MID = '#A8C8FA';
const BORDER   = '#D4E4FA';
const ORANGE   = '#F97316';
const T1       = '#0E1E40';
const T3       = '#6B9DF0';

// ── Category config ──
type CategoryFilter = 'ALL' | HelpCategory;

const CATEGORIES: { key: CategoryFilter; label: string; emoji: string }[] = [
  { key: 'ALL',      label: '전체',  emoji: '🌐' },
  { key: 'SCHOOL',   label: '학교',  emoji: '🎓' },
  { key: 'HOSPITAL', label: '건강',  emoji: '🏥' },
  { key: 'DAILY',    label: '주거',  emoji: '🏠' },
  { key: 'OTHER',    label: '취업',  emoji: '💼' },
  { key: 'BANK',     label: '금융',  emoji: '🏦' },
];

const CAT_AVATAR_COLOR: Record<HelpCategory, string> = {
  BANK: '#F0A040', HOSPITAL: '#F06060', SCHOOL: BLUE, DAILY: '#90C4F0', OTHER: '#A0A8B0',
};

type CardType = 'urgent' | 'new' | 'info';

function isUrgent(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() > 2 * 60 * 60 * 1000;
}
function formatTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}
function getCardType(item: HelpRequest): CardType {
  if (item.status === 'WAITING' && isUrgent(item.createdAt)) return 'urgent';
  if (item.status === 'WAITING') return 'new';
  return 'info';
}

const CARD_BAR: Record<CardType, string>        = { urgent: ORANGE,    new: BLUE,    info: BLUE_MID };
const CARD_BADGE_BG: Record<CardType, string>   = { urgent: '#FFF3E8', new: BLUE_L,  info: BLUE_L   };
const CARD_BADGE_FG: Record<CardType, string>   = { urgent: '#C45A10', new: BLUE,    info: T3       };
const CARD_BADGE_LABEL: Record<CardType, string>= { urgent: '긴급',    new: '신규',  info: '정보'   };

const HELP_GOAL = 20;

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [requests, setRequests]         = useState<HelpRequest[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [catFilter, setCatFilter]       = useState<CategoryFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MATCHED' | 'URGENT'>('ALL');

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

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  // Stats
  const activeCount = requests.filter(r => r.status === 'WAITING').length;
  const totalCount  = requests.filter(r => r.status !== 'CANCELLED').length;
  const urgentCount = requests.filter(r => r.status === 'WAITING' && isUrgent(r.createdAt)).length;
  const now = new Date();
  const monthCount  = requests.filter(r => {
    const d = new Date(r.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Streak dots (based on helpCount, max 7)
  const helpCount  = user?.helpCount ?? 0;
  const streakDays = Math.min(helpCount, 7);

  const filtered = requests
    .filter(r => r.status !== 'CANCELLED')
    .filter(r => catFilter === 'ALL' || r.category === catFilter)
    .filter(r => {
      if (statusFilter === 'MATCHED') return r.status === 'MATCHED';
      if (statusFilter === 'URGENT')  return r.status === 'WAITING' && isUrgent(r.createdAt);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const goTo = (item: HelpRequest) =>
    router.push({ pathname: '/request-detail', params: { id: item.id } });

  const renderCard = (item: HelpRequest) => {
    const type     = getCardType(item);
    const initial  = item.requester.nickname.charAt(0);
    const avatarBg = CAT_AVATAR_COLOR[item.category];
    return (
      <TouchableOpacity
        key={item.id}
        style={s.card}
        onPress={() => goTo(item)}
        activeOpacity={0.85}
      >
        <View style={[s.cardBar, { backgroundColor: CARD_BAR[type] }]} />
        <View style={s.cardContent}>
          <View style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <View style={[s.badge, { backgroundColor: CARD_BADGE_BG[type] }]}>
                <Text style={[s.badgeText, { color: CARD_BADGE_FG[type] }]}>
                  {CARD_BADGE_LABEL[type]}
                </Text>
              </View>
              <Text style={s.timeText}>{formatTime(item.createdAt)}</Text>
            </View>
            <TouchableOpacity style={s.helpBtn} onPress={() => goTo(item)}>
              <Text style={s.helpBtnText}>도와주기</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={s.cardFooter}>
            <View style={[s.avatar, { backgroundColor: avatarBg }]}>
              <Text style={s.avatarText}>{initial}</Text>
            </View>
            <Text style={s.schoolText}>{item.requester.nickname} · 국민대</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── NAV ── */}
        <View style={s.nav}>
          <View>
            <View style={s.locationRow}>
              <Ionicons name="location-sharp" size={11} color={BLUE} />
              <Text style={s.locationText}>{user?.university ?? '국민대학교'}</Text>
              <Ionicons name="chevron-down" size={9} color={BLUE} />
            </View>
            <Text style={s.greeting}>
              안녕하세요, <Text style={s.greetingName}>{user?.nickname ?? ''}님</Text>!
            </Text>
          </View>
          <TouchableOpacity style={s.notifBtn}>
            <Ionicons name="notifications-outline" size={15} color={T3} />
            <View style={s.notifDot} />
          </TouchableOpacity>
        </View>

        {/* ── 스트릭 카드 ── */}
        <View style={s.streakCard}>
          <View style={s.streakLeft}>
            <View style={s.streakEmoji}><Text style={s.streakEmojiText}>🔥</Text></View>
            <View>
              <Text style={s.streakTitle}>{streakDays}일 연속 활동중!</Text>
              <Text style={s.streakSub}>오늘도 도움을 드려보세요</Text>
            </View>
          </View>
          <View style={s.streakDots}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View
                key={i}
                style={[s.dot, i < streakDays ? s.dotOn : s.dotOff]}
              />
            ))}
          </View>
        </View>

        {/* ── Hero 배너 ── */}
        <View style={s.heroWrap}>
          <View style={s.hero}>
            <View style={s.heroBubble1} />
            <View style={s.heroBubble2} />
            <View style={s.heroMain}>
              <View style={s.heroLeft}>
                <Text style={s.heroSub}>지금 활동중</Text>
                <Text style={s.heroTitle}>
                  <Text style={s.heroHL}>{activeCount}명</Text>이 기다려요
                </Text>
              </View>
              <View style={s.heroMiniBox}>
                <Text style={s.heroMiniNum}>{totalCount}</Text>
                <Text style={s.heroMiniLbl}>전체요청</Text>
              </View>
            </View>
            {/* 진행 바 */}
            <View style={s.progressSection}>
              <View style={s.progressLabelRow}>
                <Text style={s.progressLabel}>이번달 도움 목표</Text>
                <Text style={s.progressValue}>{monthCount} / {HELP_GOAL}</Text>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${Math.min((monthCount / HELP_GOAL) * 100, 100)}%` }]} />
              </View>
            </View>
            {/* Pills */}
            <View style={s.heroPills}>
              <View style={s.heroPill}>
                <View style={[s.pillDot, { backgroundColor: '#A8F0C8' }]} />
                <Text style={s.pillText}>평균 2분 매칭</Text>
              </View>
              <View style={s.heroPill}>
                <View style={[s.pillDot, { backgroundColor: '#FDE68A' }]} />
                <Text style={s.pillText}>긴급 {urgentCount}건</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 카테고리 ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>카테고리</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catScroll}
        >
          {CATEGORIES.map(({ key, label, emoji }) => (
            <TouchableOpacity
              key={key}
              style={s.catItem}
              onPress={() => setCatFilter(key)}
              activeOpacity={0.8}
            >
              <View style={[s.catIcon, catFilter === key && s.catIconOn]}>
                <Text style={s.catEmoji}>{emoji}</Text>
              </View>
              <Text style={s.catLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── 최신 도움 요청 ── */}
        <View style={s.listSection}>
          <View style={s.listHeader}>
            <Text style={s.sectionLabel}>최신 도움 요청</Text>
            <TouchableOpacity>
              <Text style={s.viewAll}>전체보기</Text>
            </TouchableOpacity>
          </View>

          {/* 필터 칩 */}
          <View style={s.filterRow}>
            {(['ALL', 'MATCHED', 'URGENT'] as const).map(key => (
              <TouchableOpacity
                key={key}
                style={[s.chip, statusFilter === key && s.chipOn]}
                onPress={() => setStatusFilter(key)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, statusFilter === key && s.chipTextOn]}>
                  {key === 'ALL' ? '전체' : key === 'MATCHED' ? '매칭중' : '긴급'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 카드 목록 */}
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

      {/* ── FAB ── */}
      {user?.userType === 'INTERNATIONAL' && (
        <View style={s.fabWrap}>
          <TouchableOpacity
            style={s.fab}
            onPress={() => router.push('/(main)/write' as never)}
            activeOpacity={0.88}
          >
            <Ionicons name="add" size={13} color="#fff" />
            <Text style={s.fabText}>도움 요청하기</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLUE_BG },
  center:    { paddingVertical: 60, alignItems: 'center' },

  // ── NAV ──
  nav: {
    backgroundColor: BLUE_BG,
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 0,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  locationText: { fontSize: 13, color: BLUE, fontWeight: '700' },
  greeting:     { fontSize: 22, fontWeight: '900', color: T1, letterSpacing: -0.5 },
  greetingName: { color: BLUE },
  notifBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute', top: 5, right: 5,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: ORANGE, borderWidth: 1.5, borderColor: BLUE_BG,
  },

  // ── Streak ──
  streakCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakLeft:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakEmoji: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center', alignItems: 'center',
  },
  streakEmojiText: { fontSize: 24 },
  streakTitle:     { fontSize: 16, fontWeight: '900', color: T1, letterSpacing: -0.3 },
  streakSub:       { fontSize: 12, color: BLUE_MID, fontWeight: '500' },
  streakDots:      { flexDirection: 'row', gap: 4 },
  dot:             { width: 7, height: 7, borderRadius: 4 },
  dotOn:           { backgroundColor: BLUE },
  dotOff:          { backgroundColor: BORDER },

  // ── Hero ──
  heroWrap: { marginHorizontal: 16, marginTop: 12 },
  hero: {
    backgroundColor: BLUE,
    borderRadius: 22, padding: 18,
    overflow: 'hidden', position: 'relative',
  },
  heroBubble1: {
    position: 'absolute', top: -28, right: -28,
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#4E7FEF',
  },
  heroBubble2: {
    position: 'absolute', bottom: -22, left: -14,
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#3262D4',
  },
  heroMain: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  heroLeft:    {},
  heroSub:     { fontSize: 13, color: BLUE_MID, fontWeight: '600', marginBottom: 4, letterSpacing: 0.3 },
  heroTitle:   { fontSize: 30, fontWeight: '900', color: '#fff', lineHeight: 36, letterSpacing: -0.7 },
  heroHL: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 7, overflow: 'hidden',
  },
  heroMiniBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, padding: 8, alignItems: 'center',
  },
  heroMiniNum: { fontSize: 24, fontWeight: '900', color: '#fff', lineHeight: 28 },
  heroMiniLbl: { fontSize: 12, color: BLUE_MID, fontWeight: '500' },

  progressSection: { marginBottom: 12 },
  progressLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabel:   { fontSize: 12, color: BLUE_MID, fontWeight: '500' },
  progressValue:   { fontSize: 12, color: '#fff', fontWeight: '700' },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10, height: 7, overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: BLUE_MID, borderRadius: 10, height: '100%',
  },

  heroPills:  { flexDirection: 'row', gap: 7 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5,
  },
  pillDot:  { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // ── Category ──
  section:      { paddingHorizontal: 16, paddingTop: 14 },
  sectionLabel: { fontSize: 17, fontWeight: '900', color: T1, letterSpacing: -0.3 },
  catScroll:    { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  catItem:      { alignItems: 'center', gap: 5, flexShrink: 0 },
  catIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  catIconOn:    { backgroundColor: BLUE },
  catEmoji:     { fontSize: 24 },
  catLabel:     { fontSize: 11, fontWeight: '700', color: T1 },

  // ── List section ──
  listSection:  { paddingHorizontal: 16, paddingTop: 0 },
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  viewAll:      { fontSize: 13, fontWeight: '700', color: BLUE },
  filterRow:    { flexDirection: 'row', gap: 6, marginBottom: 10 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 5,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
  },
  chipOn:       { backgroundColor: BLUE, borderColor: BLUE },
  chipText:     { fontSize: 12, fontWeight: '700', color: BLUE_MID },
  chipTextOn:   { color: '#fff' },
  cardList:     { gap: 8 },

  // ── Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    flexDirection: 'row',
  },
  cardBar:     { width: 4, flexShrink: 0 },
  cardContent: { flex: 1, padding: 12 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 5,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText:   { fontSize: 11, fontWeight: '800' },
  timeText:    { fontSize: 12, color: BLUE_MID },
  helpBtn: {
    backgroundColor: BLUE_L,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  helpBtnText: { fontSize: 12, fontWeight: '800', color: BLUE },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: T1, lineHeight: 22, marginBottom: 7 },
  cardFooter:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  avatar: {
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText:  { fontSize: 9, color: '#fff', fontWeight: '700' },
  schoolText:  { fontSize: 12, color: BLUE_MID, fontWeight: '500' },

  // ── Empty ──
  empty:      { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 44, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: T1 },
  emptySub:   { fontSize: 16, color: BLUE_MID },

  // ── FAB ──
  fabWrap: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: BLUE,
    borderRadius: 26, paddingHorizontal: 28, paddingVertical: 12,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 24, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
});
