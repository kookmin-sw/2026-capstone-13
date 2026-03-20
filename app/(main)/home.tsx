import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  RefreshControl, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getHelpRequests, cancelHelpRequest } from '../../services/helpService';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
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
const CARD_WIDTH = Dimensions.get('window').width - 32;

function getLevel(count: number): { label: string; color: string; bg: string } {
  if (count >= 31) return { label: '마스터',  color: '#F97316', bg: '#FFF7ED' };
  if (count >= 16) return { label: '전문가',  color: '#8B5CF6', bg: '#F5F3FF' };
  if (count >= 6)  return { label: '도우미',  color: '#3B6FE8', bg: '#EEF4FF' };
  return                  { label: '새싹',    color: '#22C55E', bg: '#F0FDF4' };
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { hasUnreadForUser } = useNotificationStore();
  const [requests, setRequests]         = useState<HelpRequest[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [catFilter]                      = useState<CategoryFilter>('ALL');
const [statusFilter, setStatusFilter] = useState<'ALL' | 'MATCHED' | 'URGENT'>('ALL');

  const bannerRef = useRef<ScrollView>(null);
  const bannerIndex = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = bannerIndex.current + 1;
      bannerIndex.current = next;
      bannerRef.current?.scrollTo({ x: next * (CARD_WIDTH + 12), animated: true });

      // 복사본(2번 인덱스)에 도달하면 애니메이션 후 조용히 처음으로
      if (next === 2) {
        setTimeout(() => {
          bannerIndex.current = 0;
          bannerRef.current?.scrollTo({ x: 0, animated: false });
        }, 450);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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

  const handleDelete = (item: HelpRequest) => {
    Alert.alert('도움 요청 삭제', '이 도움 요청을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
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
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={13} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity style={s.helpBtn} onPress={() => goTo(item)}>
                <Text style={s.helpBtnText}>도와주기</Text>
              </TouchableOpacity>
            </View>
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
            <Text style={s.greeting}>
              안녕하세요, <Text style={s.greetingName}>{user?.nickname ?? ''}님</Text>!
            </Text>
          </View>
          <TouchableOpacity style={s.notifBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={15} color={T3} />
            {hasUnreadForUser(user?.id ?? 0) && <View style={s.notifDot} />}
          </TouchableOpacity>
        </View>

        {/* ── 스트릭 배너 (가로 스크롤) ── */}
        <ScrollView
          ref={bannerRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 12}
          snapToAlignment="start"
          contentContainerStyle={s.bannerScroll}
        >
          {/* 카드 1: 연속활동중 */}
          <View style={s.streakCard}>
            <View style={s.streakLeft}>
              <View style={[s.streakEmoji, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="flame" size={20} color="#F97316" />
              </View>
              <View>
                <Text style={s.streakTitle}>{streakDays}일 연속 활동중!</Text>
                <Text style={s.streakSub}>오늘도 도움을 드려보세요</Text>
              </View>
            </View>
            <View style={s.streakDots}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View key={i} style={[s.dot, i < streakDays ? s.dotOn : s.dotOff]} />
              ))}
            </View>
          </View>

          {/* 카드 2: 완료한 도움 */}
          {(() => { const lv = getLevel(helpCount); return (
          <View style={s.streakCard}>
            <View style={s.streakLeft}>
              <View style={[s.streakEmoji, { backgroundColor: lv.bg }]}>
                <Ionicons name="ribbon" size={20} color={lv.color} />
              </View>
              <View>
                <Text style={s.streakTitle}>완료한 도움 {helpCount}회</Text>
                <Text style={s.streakSub}>이번달 {monthCount}건 포함</Text>
              </View>
            </View>
            <View style={[s.levelBadge, { backgroundColor: lv.bg, borderColor: lv.color }]}>
              <Text style={[s.levelBadgeText, { color: lv.color }]}>{lv.label}</Text>
            </View>
          </View>
          ); })()}

          {/* 카드 1 복사본 (무한루프용) */}
          <View style={s.streakCard}>
            <View style={s.streakLeft}>
              <View style={[s.streakEmoji, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="flame" size={20} color="#F97316" />
              </View>
              <View>
                <Text style={s.streakTitle}>{streakDays}일 연속 활동중!</Text>
                <Text style={s.streakSub}>오늘도 도움을 드려보세요</Text>
              </View>
            </View>
            <View style={s.streakDots}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View key={i} style={[s.dot, i < streakDays ? s.dotOn : s.dotOff]} />
              ))}
            </View>
          </View>
        </ScrollView>

        {/* ── Hero 배너 ── */}
        <View style={s.heroWrap}>
          <View style={s.hero}>
            {/* 도트 그리드 배경 */}
            <View style={[StyleSheet.absoluteFill, s.dotGrid]}>
              {Array.from({ length: 300 }).map((_, i) => (
                <View key={i} style={s.dotGridDot} />
              ))}
            </View>
            {/* 글로우 */}
            <View style={s.heroGlow} />
            {/* 콘텐츠 */}
            <View style={s.heroContent}>
              <View style={s.heroMain}>
                <View style={s.heroLeft}>
                  <Text style={s.heroSub}>국민대학교 · 지금 활동중</Text>
                  <Text style={s.heroTitle}>
                    지금{' '}
                    <Text style={s.heroHL}>{activeCount}명</Text>이{'\n'}기다려요
                  </Text>
                </View>
              </View>
              <View style={s.progressSection}>
                <View style={s.progressLabelRow}>
                  <Text style={s.progressLabel}>이번달 도움 목표</Text>
                  <Text style={s.progressValue}>{monthCount} / {HELP_GOAL}</Text>
                </View>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${Math.min((monthCount / HELP_GOAL) * 100, 100)}%` }]} />
                </View>
              </View>
              <View style={s.heroPills}>
                <View style={s.heroPill}>
                  <View style={[s.pillDot, { backgroundColor: '#A8F0C8' }]} />
                  <Text style={s.pillText}>평균 2분 매칭</Text>
                </View>
                {urgentCount > 0 && (
                  <View style={s.heroPill}>
                    <View style={[s.pillDot, { backgroundColor: '#FDE68A' }]} />
                    <Text style={s.pillText}>긴급 {urgentCount}건</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>


        {/* ── 내 활동 요약 ── */}
        <View style={s.summaryWrap}>
<View style={s.summaryRow}>
            {/* 진행중인 요청 */}
            <View style={s.summaryCard}>
              <View style={s.summaryCardTop}>
                <View style={[s.summaryDot, { backgroundColor: '#F97316' }]} />
                <Text style={s.summaryCardTitle}>진행중인 요청</Text>
              </View>
              <View style={[s.summaryAccent, { backgroundColor: '#F97316' }]} />
              <Text style={s.summaryNum}>{activeCount}</Text>
              <Text style={s.summarySub}>목표까지 {Math.max(0, HELP_GOAL - helpCount)}건 남음</Text>
            </View>

            {/* 평균 만족도 */}
            <View style={s.summaryCard}>
              <View style={s.summaryCardTop}>
                <View style={[s.summaryDot, { backgroundColor: BLUE }]} />
                <Text style={s.summaryCardTitle}>평균 만족도</Text>
              </View>
              <View style={[s.summaryAccent, { backgroundColor: BLUE }]} />
              <Text style={s.summaryNum}>
                {(user as { rating?: number })?.rating?.toFixed(1) ?? '0.0'}
              </Text>
              <Text style={s.summarySub}>5점 만점 기준</Text>
            </View>
          </View>
        </View>

        {/* ── 최신 도움 요청 ── */}
        <View style={s.listSection}>

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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center:    { paddingVertical: 60, alignItems: 'center' },

  // ── NAV ──
  nav: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 72 : 40,
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
  bannerScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  streakCard: {
    width: CARD_WIDTH,
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
  progressMini:    { alignItems: 'flex-end', gap: 4 },
  progressMiniTrack: { width: 60, height: 6, backgroundColor: BORDER, borderRadius: 3 },
  progressMiniFill:  { height: 6, backgroundColor: BLUE, borderRadius: 3 },
  progressMiniText:  { fontSize: 11, fontWeight: '700', color: BLUE },

  activeBadge: {
    backgroundColor: BLUE_L, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: BORDER,
  },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: BLUE },

  levelBadge: {
    borderRadius: 10, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  levelBadgeText: { fontSize: 13, fontWeight: '800' },

  ratingWrap: { alignItems: 'center', gap: 2 },
  ratingNum:  { fontSize: 22, fontWeight: '900', color: T1 },
  ratingStar: { fontSize: 13, color: '#FBBF24' },

  // ── Hero ──
  dotGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 14, padding: 10, overflow: 'hidden',
  },
  dotGridDot: {
    width: 3, height: 3, borderRadius: 2,
    backgroundColor: BLUE, opacity: 0.15,
  },
  heroGlow: {
    position: 'absolute', top: -30, right: -30,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: BLUE, opacity: 0.05,
  },
  heroContent: { position: 'relative', zIndex: 1 },
  heroWrap: { marginHorizontal: 16, marginTop: 12 },
  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22, padding: 18,
    overflow: 'hidden', position: 'relative',
    borderWidth: 1, borderColor: BORDER,
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
  heroSub:     { fontSize: 13, color: T3, fontWeight: '600', marginBottom: 4, letterSpacing: 0.3 },
  heroTitle:   { fontSize: 30, fontWeight: '900', color: T1, lineHeight: 36, letterSpacing: -0.7 },
  heroHL:      { color: BLUE },
  heroMiniBox: {
    backgroundColor: 'rgba(168,200,250,0.25)',
    borderRadius: 12, padding: 8, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(168,200,250,0.35)',
  },
  heroMiniNum: { fontSize: 24, fontWeight: '900', color: BLUE, lineHeight: 28 },
  heroMiniLbl: { fontSize: 12, color: T3, fontWeight: '500' },

  progressSection: { marginBottom: 12, marginTop: 6 },
  progressLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabel:   { fontSize: 12, color: T3, fontWeight: '500' },
  progressValue:   { fontSize: 12, color: BLUE, fontWeight: '700' },
  progressTrack: {
    backgroundColor: BORDER,
    borderRadius: 10, height: 7, overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: BLUE, borderRadius: 10, height: '100%',
  },

  heroPills:  { flexDirection: 'row', gap: 7 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(168,200,250,0.18)',
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(168,200,250,0.3)',
  },
  pillDot:  { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 12, fontWeight: '700', color: BLUE },

  // ── Category ──
  section:      { paddingHorizontal: 16, paddingTop: 14 },
  sectionLabel: { fontSize: 17, fontWeight: '900', color: T1, letterSpacing: -0.3 },
  catScroll:    { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  catGrid:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
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

  // ── 내 활동 요약 ──
  summaryWrap: { paddingHorizontal: 16, marginTop: 16, marginBottom: 4 },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: T1, marginBottom: 12, letterSpacing: -0.3 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14,
  },
  summaryCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryCardTitle: { fontSize: 13, fontWeight: '600', color: T3 },
  summaryNum: { fontSize: 28, fontWeight: '900', color: T1, letterSpacing: -0.5, marginBottom: 2 },
  summarySub: { fontSize: 12, color: BLUE_MID, fontWeight: '500' },
  summaryAccent: { height: 2, borderRadius: 1, marginTop: 1, marginBottom: 8, marginHorizontal: -14 },
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  viewAll:      { fontSize: 13, fontWeight: '700', color: BLUE },
  filterRow:    { flexDirection: 'row', gap: 6, marginBottom: 10, marginTop: 14 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 22, backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
  },
  chipOn:       { backgroundColor: BLUE, borderColor: BLUE },
  chipText:     { fontSize: 14, fontWeight: '700', color: BLUE_MID },
  chipTextOn:   { color: '#fff' },
  cardList:     { gap: 10 },

  // ── Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    flexDirection: 'row',
  },
  cardBar:     { width: 5, flexShrink: 0 },
  cardContent: { flex: 1, paddingHorizontal: 16, paddingVertical: 6 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge:       { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  badgeText:   { fontSize: 13, fontWeight: '800' },
  timeText:    { fontSize: 13, color: BLUE_MID },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center', alignItems: 'center',
  },
  helpBtn: {
    backgroundColor: BLUE_L,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
  },
  helpBtnText: { fontSize: 14, fontWeight: '800', color: BLUE },
  cardTitle:   { fontSize: 17, fontWeight: '700', color: T1, lineHeight: 24, marginBottom: 10 },
  cardFooter:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText:  { fontSize: 11, color: '#fff', fontWeight: '700' },
  schoolText:  { fontSize: 14, color: BLUE_MID, fontWeight: '500' },

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
