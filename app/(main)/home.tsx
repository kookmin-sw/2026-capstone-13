// 홈 화면 - Bento Grid 디자인
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getHelpRequests } from '../../services/helpService';
import { useAuthStore } from '../../stores/authStore';
import type { HelpCategory, HelpMethod, HelpRequest } from '../../types';

// ── Design tokens (HTML 디자인 기준) ──
const BLUE     = '#1A73C8';
const TEAL     = '#00A88E';
const ORANGE   = '#F07A1A';
const T1       = '#0A1E2E';
const T2       = '#4A6070';
const T3       = '#9BB0BF';
const BLUE_L   = '#E8F3FD';
const TEAL_L   = '#E0F5F2';
const GREEN_L  = '#E8F5E9';
const ORANGE_L = '#FEF0E0';
const YELLOW_L = '#FEF9E0';
const BG       = '#FFFFFF';


type SortMode = 'LATEST' | 'OLDEST' | 'MATCHED' | 'URGENT';

const FILTER_CHIPS: { key: SortMode; label: string }[] = [
  { key: 'LATEST',  label: '최신순'  },
  { key: 'OLDEST',  label: '오래된순' },
  { key: 'MATCHED', label: '매칭중'  },
  { key: 'URGENT',  label: '긴급'    },
];

const CAT_EMOJI: Record<HelpCategory, string> = {
  BANK: '🏦', HOSPITAL: '🏥', SCHOOL: '🏫', DAILY: '🏠', OTHER: '📌',
};
const CAT_BG: Record<HelpCategory, string> = {
  BANK: YELLOW_L, HOSPITAL: '#FEE2E2', SCHOOL: TEAL_L, DAILY: GREEN_L, OTHER: '#F3F4F6',
};
const METHOD: Record<HelpMethod, { bg: string; color: string; dot: string; label: string }> = {
  CHAT:       { bg: BLUE_L,   color: '#0D4F8C', dot: BLUE,   label: '채팅'    },
  VIDEO_CALL: { bg: TEAL_L,   color: '#005E4F', dot: TEAL,   label: '영상통화' },
  OFFLINE:    { bg: ORANGE_L, color: '#7A3300', dot: ORANGE, label: '오프라인' },
};

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

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('LATEST');

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
  const now = new Date();
  const monthCount  = requests.filter(r => {
    const d = new Date(r.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const filtered = requests
    .filter(r => r.status !== 'CANCELLED')
    .filter(r => {
      if (sortMode === 'MATCHED') return r.status === 'MATCHED';
      if (sortMode === 'URGENT')  return r.status === 'WAITING' && isUrgent(r.createdAt);
      return true;
    })
    .sort((a, b) =>
      sortMode === 'OLDEST'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const goTo = (item: HelpRequest) =>
    router.push({ pathname: '/request-detail', params: { id: item.id } });

  // ── Card renderer ───────────────────────────────────
  const renderCard = (item: HelpRequest) => {
    const m = METHOD[item.helpMethod];
    const isDone = item.status !== 'WAITING';
    const urgent = isUrgent(item.createdAt) && item.status === 'WAITING';
    return (
      <TouchableOpacity
        key={item.id}
        style={[s.card, urgent && s.cardUrgent]}
        onPress={() => goTo(item)}
        activeOpacity={0.85}
      >
        <View style={[s.cardIcon, { backgroundColor: CAT_BG[item.category] }]}>
          <Text style={s.iconEmoji}>{CAT_EMOJI[item.category]}</Text>
        </View>
        <View style={s.cardBody}>
          <View style={s.cardTop}>
            {urgent && <View style={s.urgBadge}><Text style={s.urgBadgeText}>긴급</Text></View>}
            <View style={isDone ? s.statusDone : s.statusOpen}>
              <Text style={[s.statusTxt, isDone ? s.statusDoneTxt : s.statusOpenTxt]}>
                {isDone ? '완료' : '모집중'}
              </Text>
            </View>
          </View>
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.cardDesc}  numberOfLines={2}>{item.description}</Text>
          <View style={s.cardFooter}>
            <View style={s.metaRow}>
              <View style={s.schoolTag}><Text style={s.schoolTagText}>국민대</Text></View>
              <Text style={s.timeText}>{formatTime(item.createdAt)}</Text>
            </View>
            <View style={[s.methodBadge, { backgroundColor: m.bg }]}>
              <View style={[s.dot, { backgroundColor: m.dot }]} />
              <Text style={[s.methodText, { color: m.color }]}>{m.label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── List layout ──────────────────────────────────────
  const renderList = () => {
    if (filtered.length === 0) {
      return (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>📋</Text>
          <Text style={s.emptyTitle}>해당하는 요청이 없어요</Text>
          <Text style={s.emptySub}>다른 필터를 선택해보세요</Text>
        </View>
      );
    }
    return filtered.map(renderCard);
  };

  return (
    <View style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Hero ─────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.bubble1} />
          <View style={s.bubble2} />

          {/* 로고 + 아이콘 */}
          <View style={s.heroTop}>
            <View style={s.logoRow}>
              <View style={s.logoPill}><Text style={s.logoPillText}>🤝</Text></View>
              <Text style={s.logoName}>도와줘<Text style={s.logoAccent}>코리안</Text></Text>
            </View>
            <View style={s.heroBtns}>
              <TouchableOpacity style={s.hBtn} onPress={() => router.push('/search' as never)}>
                <Ionicons name="search-outline" size={17} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={s.hBtn}>
                <Ionicons name="notifications-outline" size={17} color="#fff" />
                <View style={s.notifDot} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 헤드라인 */}
          <View style={s.heroHeadline}>
            <Text style={s.heroSub}>국민대학교 · 지금 활동중</Text>
            <Text style={s.heroTitle}>
              지금 <Text style={s.heroHL}>{activeCount}명</Text>이{'\n'}도움을 기다려요
            </Text>
          </View>

          {/* 통계 pill */}
          <View style={s.statRow}>
            <View style={s.statPill}>
              <Text style={s.statNum}>{totalCount}</Text>
              <Text style={s.statLbl}>전체 도움 요청</Text>
            </View>
            <View style={s.statPill}>
              <Text style={s.statNum}>{user?.rating?.toFixed(1) ?? '4.9'}</Text>
              <Text style={s.statLbl}>평균 만족도</Text>
            </View>
            <View style={s.statPill}>
              <Text style={s.statNum}>{monthCount}</Text>
              <Text style={s.statLbl}>이번 달 활동</Text>
            </View>
          </View>
        </View>

        {/* ── 필터 칩 ──────────────────────────────── */}
        <View style={s.filterWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
            {FILTER_CHIPS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[s.chip, sortMode === key && s.chipOn]}
                onPress={() => setSortMode(key)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, sortMode === key && s.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Bento 그리드 ─────────────────────────── */}
        <View style={s.bento}>
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>최신 도움 요청</Text>
            <TouchableOpacity style={s.moreBtn}>
              <Text style={s.moreBtnText}>전체보기</Text>
            </TouchableOpacity>
          </View>

          {isLoading
            ? <View style={s.center}><ActivityIndicator size="large" color={TEAL} /></View>
            : renderList()
          }
        </View>
      </ScrollView>

      {/* FAB - 유학생만 */}
      {user?.userType === 'INTERNATIONAL' && (
        <TouchableOpacity style={s.fab} onPress={() => router.push('/(main)/write' as never)} activeOpacity={0.88}>
          <View style={s.fabPlus}><Text style={s.fabPlusText}>+</Text></View>
          <Text style={s.fabText}>도움 요청하기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },

  // ── Hero ─────────────────────────────────────────────
  hero: {
    backgroundColor: BLUE,
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 28,
    paddingHorizontal: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  bubble1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -60, right: -40,
  },
  bubble2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -30, left: 30,
  },

  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 22, zIndex: 2,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoPill: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoPillText: { fontSize: 16 },
  logoName: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.4 },
  logoAccent: { color: '#F5C518' },

  heroBtns: { flexDirection: 'row', gap: 8 },
  hBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute', top: -2, right: -2,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#F07A1A', borderWidth: 1.5, borderColor: BLUE,
  },

  heroHeadline: { marginBottom: 18, zIndex: 2 },
  heroSub:   { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '500', marginBottom: 4, letterSpacing: 0.4 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', lineHeight: 32, letterSpacing: -0.8 },
  heroHL:    { color: '#F5C518' },

  statRow:  { flexDirection: 'row', gap: 8, zIndex: 2 },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14, padding: 10,
  },
  statNum: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5, lineHeight: 24 },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginTop: 2 },

  // ── Filter ───────────────────────────────────────────
  filterWrap: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,115,200,0.08)',
  },
  filterScroll: { paddingHorizontal: 16, gap: 7 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 40, flexShrink: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: 'rgba(26,115,200,0.1)',
  },
  chipOn:   { backgroundColor: TEAL, borderColor: TEAL },
  chipText:  { fontSize: 12, fontWeight: '600', color: T2 },
  chipTextOn:{ color: '#fff' },

  // ── List ─────────────────────────────────────────────
  bento: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },

  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 2,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: T1 },
  moreBtn: {
    backgroundColor: TEAL_L, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  moreBtnText: { fontSize: 12, fontWeight: '600', color: TEAL },

  // ── Card ─────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(26,115,200,0.08)',
    shadowColor: BLUE, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  cardUrgent: {
    backgroundColor: '#FEF4EC',
    borderColor: 'rgba(240,122,26,0.2)',
  },
  cardIcon: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  iconEmoji: { fontSize: 24 },
  cardBody:  { flex: 1, gap: 5 },
  cardTop:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: T1, lineHeight: 20, letterSpacing: -0.3 },
  cardDesc:  { fontSize: 12, color: T2, lineHeight: 18 },
  cardFooter:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  urgBadge: {
    backgroundColor: ORANGE, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  urgBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // ── Shared badge styles ───────────────────────────────
  statusOpen: {
    backgroundColor: TEAL_L, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20,
  },
  statusDone: {
    backgroundColor: '#F3F4F6', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20,
  },
  statusTxt:     { fontSize: 10, fontWeight: '700' },
  statusOpenTxt: { color: '#005E4F' },
  statusDoneTxt: { color: '#6B7280' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  schoolTag: { backgroundColor: BLUE_L, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  schoolTagText: { fontSize: 11, fontWeight: '600', color: BLUE },
  timeText: { fontSize: 11, color: T3 },

  methodBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  dot:        { width: 5, height: 5, borderRadius: 3 },
  methodText: { fontSize: 11, fontWeight: '600' },

  // ── Empty ────────────────────────────────────────────
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 44, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T2 },
  emptySub:   { fontSize: 14, color: T3 },

  // ── FAB ──────────────────────────────────────────────
  fab: {
    position: 'absolute', bottom: 24, right: 16,
    backgroundColor: TEAL,
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 28,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 24, elevation: 8,
  },
  fabPlus: {
    width: 22, height: 22, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  fabPlusText: { fontSize: 16, color: '#fff', fontWeight: '300', lineHeight: 20 },
  fabText:     { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
});
