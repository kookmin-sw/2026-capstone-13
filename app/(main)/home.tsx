import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../services/api';
import SwipeCardStack from '../../components/SwipeCardStack';
import { getHelpedRequests, getHelpRequests } from '../../services/helpService';
import { getCommunityPosts, type CommunityPostDto } from '../../services/communityService';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import type { HelpRequest } from '../../types';

// ── Design tokens ──
const BLUE   = '#3B6FE8';
const BLUE_L = '#EEF4FF';
const ORANGE = '#F97316';
const T1     = '#0C1C3C';
const T2     = '#AABBCC';
const BG     = '#FFFFFF';
const DIV    = '#F4F5F8';


function getLevel(count: number): { label: string; color: string; bg: string } {
  if (count >= 31) return { label: '마스터', color: '#F97316', bg: '#FFF7ED' };
  if (count >= 16) return { label: '전문가', color: '#8B5CF6', bg: '#F5F3FF' };
  if (count >= 6)  return { label: '도우미', color: '#3B6FE8', bg: '#EEF4FF' };
  return                  { label: '새싹',   color: '#22C55E', bg: '#F0FDF4' };
}

type StatusFilter = 'ALL' | 'WAITING' | 'COMPLETED' | 'URGENT';
type CatFilter = 'ALL' | HelpCategory;

interface MealData {
  id: number;
  mealDate: string;
  cafeteria: string;
  corner: string;
  menu: string;
}

interface SchoolNotice {
  id: number;
  categoryName: string;
  titleKo: string;
  title: string;
  link: string;
  pubDate: string | null;
}



export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { hasUnreadForUser } = useNotificationStore();
  const [requests, setRequests]             = useState<HelpRequest[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [showCount, setShowCount]           = useState(false);
  const [refreshing, setRefreshing]         = useState(false);
  const [notices, setNotices]               = useState<SchoolNotice[]>([]);
  const [meals, setMeals]                   = useState<MealData[]>([]);
  const [hotPosts, setHotPosts]             = useState<CommunityPostDto[]>([]);
  const scrollViewRef                        = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setInterval(() => setShowCount(prev => !prev), 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api.get('/notices').then(res => setNotices(Array.isArray(res.data.data) ? res.data.data : [])).catch(() => {});
    api.get('/meals').then(res => setMeals(res.data.data ?? [])).catch(() => {});
    getCommunityPosts().then(res => { if (res.success) setHotPosts(res.data.content.filter(p => p.likes >= 10).slice(0, 6)); }).catch(() => {});
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
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchRequests(); }, [fetchRequests]));

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const rating = (user as { rating?: number })?.rating ?? 0;

  const goTo = (item: HelpRequest) =>
    router.push({ pathname: '/request-detail', params: { id: item.id } });

  return (
    <View style={s.container}>
      {/* ── NAV (고정) ── */}
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

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 100 : 72, paddingBottom: 100 }}
      >

        {/* ── 상단 요약 카드 2개 (학식 / 공지) ── */}
        <View style={s.summaryRow}>
          {/* 오늘 학식 */}
          {(() => {
            const meal = meals[0];
            return (
              <View style={s.summaryCardMeal}>
                <View style={s.summaryIconWrap}>
                  <Ionicons name="restaurant-outline" size={14} color={BLUE} />
                </View>
                <View style={s.summaryTextWrap}>
                  <Text style={s.summaryLabel}>오늘 학식</Text>
                  <Text style={s.summaryValue} numberOfLines={1}>
                    {meal ? `${meal.corner} · ${meal.menu.split('\n').filter(Boolean)[0] ?? ''}` : '정보 없음'}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* 새 공지 */}
          {(() => {
            const notice = notices[0];
            return (
              <TouchableOpacity
                style={s.summaryCardNotice}
                onPress={() => notice?.link ? Linking.openURL(notice.link) : undefined}
                activeOpacity={0.85}
              >
                <View style={s.summaryIconWrap}>
                  <Ionicons name="megaphone-outline" size={14} color={BLUE} />
                </View>
                <View style={s.summaryTextWrap}>
                  <Text style={s.summaryLabel}>새 공지</Text>
                  <Text style={s.summaryValue} numberOfLines={1}>
                    {notice ? notice.titleKo : '정보 없음'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* ── 지금 도움이 필요해요 헤더 ── */}
        <View style={s.helpHeader}>
          <View style={s.helpHeaderLeft}>
            <Text style={s.helpHeaderTitle}>지금 도움이 필요해요</Text>
            <View style={s.helpCountBadge}>
              <Text style={s.helpCountText}>{requests.filter(r => r.status === 'WAITING').length}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/help-list')}
            activeOpacity={0.7}
          >
            <Text style={s.helpHeaderLink}>전체보기 →</Text>
          </TouchableOpacity>
        </View>

        {/* ── 스와이프 카드 ── */}
        <View style={{ marginLeft: 20, marginBottom: 20 }}>
          <SwipeCardStack
            requests={requests.filter(r => r.status === 'WAITING')}
            onSwipeRight={(card) => goTo(card)}
          />
        </View>

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

        {/* ── 지금 핫한 게시글 ── */}
        <View style={s.hotSection}>
          <View style={s.hotHeader}>
            <Text style={s.hotHeaderEmoji}>🔥</Text>
            <Text style={s.hotHeaderTitle}>지금 핫한 게시글</Text>
            <TouchableOpacity onPress={() => router.push('/(main)/community')} activeOpacity={0.7} style={s.hotMoreBtn}>
              <Text style={s.hotMoreText}>더보기 →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hotScroll}>
            {hotPosts.length === 0 ? (
              <View style={s.hotEmpty}>
                <Text style={s.hotEmptyText}>아직 인기 게시글이 없어요</Text>
              </View>
            ) : hotPosts.map(post => {
              const catColor: Record<string, string> = { INFO: BLUE, QUESTION: ORANGE, CHAT: '#6B9DF0', CULTURE: '#8B5CF6' };
              const catBg:    Record<string, string> = { INFO: BLUE_L, QUESTION: '#FFF3E8', CHAT: BLUE_L, CULTURE: '#F5F3FF' };
              const catLabel: Record<string, string> = { INFO: '정보공유', QUESTION: '질문', CHAT: '잡담', CULTURE: '문화교류' };
              const color = catColor[post.category] ?? BLUE;
              const bg    = catBg[post.category]    ?? BLUE_L;
              const AVATAR_COLORS = ['#F0A040', '#F06060', BLUE, '#90C4F0', '#A0A8B0'];
              let h = 0;
              for (let i = 0; i < post.author.length; i++) h = (h + post.author.charCodeAt(i)) % AVATAR_COLORS.length;
              const avatarColor = AVATAR_COLORS[h];
              return (
                <TouchableOpacity
                  key={post.id}
                  style={s.hotCard}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/community-post', params: { id: post.id } })}
                >
                  <View style={s.hotCardTop}>
                    <View style={[s.hotCatBadge, { backgroundColor: bg }]}>
                      <Text style={[s.hotCatText, { color }]}>{catLabel[post.category] ?? post.category}</Text>
                    </View>
                    {post.likes >= 30 && <Text style={s.hotFire}>🔥</Text>}
                  </View>
                  <Text style={s.hotTitle} numberOfLines={2}>{post.title}</Text>
                  <Text style={s.hotContent} numberOfLines={2}>{post.content}</Text>
                  <View style={s.hotCardFooter}>
                    <View style={[s.hotAvatar, { backgroundColor: avatarColor }]}>
                      <Text style={s.hotAvatarText}>{post.author.charAt(0)}</Text>
                    </View>
                    <Text style={s.hotAuthor}>{post.author}</Text>
                    <View style={s.hotStats}>
                      <Ionicons name="heart" size={12} color={ORANGE} />
                      <Text style={s.hotStatText}>{post.likes}</Text>
                      <Ionicons name="chatbubble-outline" size={12} color={T2} style={{ marginLeft: 6 }} />
                      <Text style={s.hotStatText}>{post.comments}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

      </ScrollView>

      {/* ── 도움 요청하기 FAB (외국인만) ── */}
      {(user?.userType === 'INTERNATIONAL' || user?.userType === 'EXCHANGE') && (
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push('/(main)/write')}
          activeOpacity={0.85}
        >
          <Text style={s.fabText}>+ 도움 요청하기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center:    { paddingVertical: 60, alignItems: 'center' },

  // ── NAV ──
  nav: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingBottom: 10,
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

  // ── Hero (슬라이드 카드 내 히어로 컨텐츠용) ──
  heroLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  heroDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  heroLocation: { fontSize: 12, color: '#6B9DF0', fontWeight: '600' },
  heroTitle:  { fontSize: 22, fontWeight: '900', color: T1, letterSpacing: -0.5, marginBottom: 10 },
  heroHL:     { color: BLUE },
  heroSub:    { fontSize: 12, color: T2, fontWeight: '500' },
  heroUrgent: { fontSize: 12, color: ORANGE, fontWeight: '700', marginTop: 4 },
  heroBottom: { padding: 12, paddingTop: 10 },
  heroBtn: {
    backgroundColor: BLUE, borderRadius: 14, padding: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  heroBtnText:          { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  heroProgressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, marginTop: 10 },
  heroProgressLabel:    { fontSize: 11, color: '#6B9DF0', fontWeight: '500' },
  heroProgressValue:    { fontSize: 11, color: BLUE, fontWeight: '700' },
  heroProgressTrack:    { backgroundColor: '#D4E4FA', borderRadius: 10, height: 6, overflow: 'hidden' },
  heroProgressFill:     { backgroundColor: BLUE, borderRadius: 10, height: '100%' },


  // ── Section Card ──
  sectionCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
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
    borderRadius: 16,
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

  // ── 상단 요약 카드 ──
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 12,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  summaryCardMeal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryCardNotice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    shadowColor: '#3B6FE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: BLUE_L,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextWrap: { flex: 1 },
  summaryLabel:    { fontSize: 11, color: T2, fontWeight: '600', marginBottom: 2 },
  summaryValue:    { fontSize: 12, color: T1, fontWeight: '700' },

  // ── 지금 도움이 필요해요 헤더 ──
  helpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  helpHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helpHeaderTitle: { fontSize: 17, fontWeight: '900', color: T1, letterSpacing: -0.4 },
  helpCountBadge: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  helpCountText:  { fontSize: 12, fontWeight: '800', color: '#fff' },
  helpHeaderLink: { fontSize: 13, fontWeight: '700', color: BLUE },

  // ── 핫한 게시글 ──
  hotSection:    { marginTop: 8, marginBottom: 16 },
  hotHeader:     { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12 },
  hotHeaderEmoji:{ fontSize: 16, marginRight: 4 },
  hotHeaderTitle:{ fontSize: 17, fontWeight: '900', color: T1, letterSpacing: -0.4, flex: 1 },
  hotMoreBtn:    {},
  hotMoreText:   { fontSize: 13, fontWeight: '700', color: BLUE },
  hotScroll:     { paddingHorizontal: 16, gap: 10 },
  hotEmpty:      { paddingVertical: 20, paddingHorizontal: 16 },
  hotEmptyText:  { fontSize: 13, color: T2 },
  hotCard: {
    width: 180,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F2F6',
    gap: 6,
  },
  hotCardTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hotCatBadge:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  hotCatText:    { fontSize: 11, fontWeight: '800' },
  hotFire:       { fontSize: 13 },
  hotTitle:      { fontSize: 13, fontWeight: '700', color: T1, lineHeight: 18 },
  hotContent:    { fontSize: 11, color: T2, lineHeight: 16 },
  hotCardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 },
  hotAvatar:     { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  hotAvatarText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  hotAuthor:     { fontSize: 11, color: T2, fontWeight: '600', flex: 1 },
  hotStats:      { flexDirection: 'row', alignItems: 'center', gap: 2 },
  hotStatText:   { fontSize: 11, color: T2, fontWeight: '600' },
});
