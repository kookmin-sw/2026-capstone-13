import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import KoreanUserCardStack from '../../components/KoreanUserCardStack';
import SwipeCardStack from '../../components/SwipeCardStack';
import WriteForm from '../../components/WriteForm';
import { getKoreanUsers } from '../../services/authService';
import { getHelpedRequests, getHelpRequests } from '../../services/helpService';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import type { HelpRequest, HelpCategory, User } from '../../types';

// ── Design tokens ──
const BLUE   = '#3B6FE8';
const BLUE_L = '#EEF4FF';
const ORANGE = '#F97316';
const T1     = '#0C1C3C';
const T2     = '#AABBCC';
const BG     = '#F0F4FA';
const DIV    = '#D4E4FF';




function formatRelativeTime(createdAt: string): string {
  const date = new Date(createdAt.includes('Z') || createdAt.includes('+') ? createdAt : createdAt + 'Z');
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
}

// ── 한국인용: ~일 연속 접속중 캐러셀 ──
interface StreakTopCarouselProps {
  completedCount: number;
  waitingCount: number;
  inProgressCount: number;
  progress: number;
  DOTS: number;
}

function StreakTopCarousel({ completedCount, waitingCount, progress, DOTS }: StreakTopCarouselProps) {
  const [slide, setSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setSlide(prev => (prev + 1) % 2);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [fadeAnim]);

  return (
    <Animated.View style={[s.streakTopRow, { opacity: fadeAnim }]}>
      <View style={s.streakTextWrap}>
        {slide === 0 ? (
          <Text style={s.streakTitle}>{completedCount}일 연속 접속중!</Text>
        ) : (
          <View style={s.streakSlide2Row}>
            <Text style={s.streakSlide2Text}>지금 도움이 필요해요</Text>
            <View style={s.streakSlide2Badge}>
              <Text style={s.streakSlide2BadgeText}>{waitingCount}</Text>
            </View>
          </View>
        )}
      </View>
      {slide === 0 && (
        <View style={s.streakDots}>
          {Array.from({ length: DOTS }).map((_, i) => (
            <View key={i} style={[s.streakDot, i < Math.round(progress * DOTS) && s.streakDotOn]} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

// ── 외국인용: 통계 + CTA 슬라이드 캐러셀 ──
interface IntlTopCarouselProps {
  completedCount: number;
  waitingCount: number;
  inProgressCount: number;
}

function IntlTopCarousel({ completedCount, waitingCount, inProgressCount }: IntlTopCarouselProps) {
  const [slide, setSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setSlide(prev => (prev + 1) % 2);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [fadeAnim]);

  return (
    <Animated.View style={[s.streakSlideWrap, { opacity: fadeAnim }]}>
      {slide === 0 ? (
        <View style={s.streakStatRow}>
          {[
            { label: '요청도움', value: waitingCount,    color: ORANGE,    bg: 'rgba(249,115,22,0.10)' },
            { label: '진행중',   value: inProgressCount, color: BLUE,      bg: 'rgba(59,111,232,0.10)' },
            { label: '완료',     value: completedCount,  color: '#22C55E', bg: 'rgba(34,197,94,0.10)'  },
          ].map(({ label, value, color, bg }) => (
            <View key={label} style={[s.streakStatItem, { backgroundColor: bg }]}>
              <Text style={[s.streakStatNum, { color }]}>{value}</Text>
              <Text style={[s.streakStatLabel, { color }]}>{label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={s.streakCtaRow}>
          <View style={s.streakCtaTextWrap}>
            <Text style={s.streakCtaTitle}>지금 바로 도움을 요청해보세요!</Text>
            <Text style={s.streakCtaSub}>한국인 헬퍼가 기다리고 있어요</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}


export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { hasUnread, fetchHasUnread } = useNotificationStore();
  const isInternational = user?.userType === 'INTERNATIONAL' || user?.userType === 'EXCHANGE';
  const [requests, setRequests]             = useState<HelpRequest[]>([]);
  const [koreanUsers, setKoreanUsers]       = useState<User[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [refreshing, setRefreshing]         = useState(false);
  const [viewMode, setViewMode]              = useState<'card' | 'list'>('card');
  const [searchQuery, setSearchQuery]        = useState('');
  const [statusFilter, setStatusFilter]      = useState<'ALL' | 'WAITING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [intlTab, setIntlTab]                = useState<'card' | 'write' | 'list'>('card');
  const tabAnim                              = useRef(new Animated.Value(0)).current;
  const intlTabAnim                          = useRef(new Animated.Value(0)).current;

  const switchTab = useCallback((mode: 'card' | 'list') => {
    setViewMode(mode);
    Animated.spring(tabAnim, {
      toValue: mode === 'card' ? 0 : 1,
      useNativeDriver: false,
      friction: 10,
      tension: 35,
    }).start();
  }, [tabAnim]);

  const switchIntlTab = useCallback((mode: 'card' | 'write' | 'list') => {
    setIntlTab(mode);
    Animated.spring(intlTabAnim, {
      toValue: mode === 'card' ? 0 : mode === 'write' ? 1 : 2,
      useNativeDriver: false,
      friction: 10,
      tension: 35,
    }).start();
  }, [intlTabAnim, setIntlTab]);
  const scrollViewRef                        = useRef<ScrollView>(null);

  useEffect(() => {
    if (user?.userType === 'INTERNATIONAL' || user?.userType === 'EXCHANGE') {
      getKoreanUsers().then(res => {
        if (res.success) setKoreanUsers(res.data.filter((u: User) => u.nickname !== '(알 수 없음)'));
      }).catch(() => {});
    }
  }, [user]);

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

  useEffect(() => { fetchHasUnread(); }, []);
  useFocusEffect(useCallback(() => { fetchRequests(); }, [fetchRequests]));

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

const goTo = (item: HelpRequest) =>
    router.push({ pathname: '/request-detail', params: { id: item.id } });

  return (
    <View style={s.container}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 56 : 32, paddingBottom: 100 }}
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
              {hasUnread && <View style={s.notifDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 연속 도움중 카드 (공통 표시) ── */}
        {(() => {
          const MONTHLY_GOAL = 20;
          const progress = Math.min(completedCount / MONTHLY_GOAL, 1);
          const DOTS = 9;
          const waitingCount = requests.filter(r => r.status === 'WAITING').length;
          const inProgressCount = requests.filter(r => r.status === 'IN_PROGRESS').length;
          return (
            <View style={s.streakCard}>
              {isInternational ? (
                <IntlTopCarousel
                  completedCount={completedCount}
                  waitingCount={waitingCount}
                  inProgressCount={inProgressCount}
                />
              ) : (
                <>
                  <StreakTopCarousel
                    completedCount={completedCount}
                    waitingCount={waitingCount}
                    inProgressCount={inProgressCount}
                    progress={progress}
                    DOTS={DOTS}
                  />
                  <View style={s.streakProgressWrap}>
                    <View style={s.streakProgressLabelRow}>
                      <Text style={s.streakProgressLabel}>이번달 도움 목표</Text>
                      <Text style={s.streakProgressCount}>{completedCount} / {MONTHLY_GOAL}</Text>
                    </View>
                    <View style={s.streakProgressTrack}>
                      <View style={[s.streakProgressFill, { width: `${progress * 100}%` as `${number}%` }]} />
                    </View>
                  </View>
                </>
              )}
            </View>
          );
        })()}

        {/* ── 헤더 & 스와이프 카드 ── */}
        {isInternational ? (
          <>
            {/* 3탭 (유학생) */}
            <View style={s.viewTabRow}>
              <Animated.View style={[s.viewTabSlider, {
                left: intlTabAnim.interpolate({ inputRange: [0, 1, 2], outputRange: ['2%', '35%', '69%'] }),
                width: '31%',
              }]} />
              <TouchableOpacity style={s.viewTab} onPress={() => switchIntlTab('card')} activeOpacity={0.8}>
                <Ionicons name="layers-outline" size={14} color={intlTab === 'card' ? '#fff' : '#888'} />
                <Text style={[s.viewTabText, intlTab === 'card' && s.viewTabTextOn]}>헬퍼 보기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.viewTab} onPress={() => switchIntlTab('write')} activeOpacity={0.8}>
                <Ionicons name="pencil-outline" size={14} color={intlTab === 'write' ? '#fff' : '#888'} />
                <Text style={[s.viewTabText, intlTab === 'write' && s.viewTabTextOn]}>도움 요청하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.viewTab} onPress={() => switchIntlTab('list')} activeOpacity={0.8}>
                <Ionicons name="list-outline" size={14} color={intlTab === 'list' ? '#fff' : '#888'} />
                <Text style={[s.viewTabText, intlTab === 'list' && s.viewTabTextOn]}>목록 보기</Text>
              </TouchableOpacity>
            </View>
            {intlTab === 'card' ? (
              <View style={{ marginLeft: 16, marginBottom: 10 }}>
                <KoreanUserCardStack
                  users={koreanUsers}
                  onPress={() => switchIntlTab('write')}
                />
              </View>
            ) : intlTab === 'write' ? (
              <WriteForm onSuccess={() => switchIntlTab('list')} />
            ) : (
              <View style={s.listViewWrap}>
                <View style={s.listFilterRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.listFilterScroll} style={{ maxWidth: 260 }}>
                    {([
                      { key: 'ALL',         label: '전체' },
                      { key: 'WAITING',     label: '최신' },
                      { key: 'IN_PROGRESS', label: '매칭중' },
                      { key: 'COMPLETED',   label: '완료' },
                    ] as const).map(({ key, label }) => (
                      <TouchableOpacity
                        key={key}
                        style={[s.listFilterChip, statusFilter === key && s.listFilterChipOn]}
                        onPress={() => setStatusFilter(key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.listFilterChipText, statusFilter === key && s.listFilterChipTextOn]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={s.searchBox}>
                    <Ionicons name="search-outline" size={15} color={T2} />
                    <TextInput
                      style={s.searchInput}
                      placeholder="검색"
                      placeholderTextColor={T2}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                        <Ionicons name="close-circle" size={15} color={T2} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {(() => {
                  const CAT_LABEL: Record<HelpCategory, string> = {
                    BANK: '은행', HOSPITAL: '병원', SCHOOL: '학교', DAILY: '일상', OTHER: '기타',
                  };
                  const filtered = requests
                    .filter(r => statusFilter === 'ALL'
                      ? (r.status === 'WAITING' || r.status === 'IN_PROGRESS' || r.status === 'COMPLETED')
                      : r.status === statusFilter
                    )
                    .filter(r => searchQuery.trim() === '' ||
                      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (r.requester?.nickname ?? '').toLowerCase().includes(searchQuery.toLowerCase())
                    );
                  if (filtered.length === 0) {
                    return (
                      <View style={s.listEmpty}>
                        <Text style={s.listEmptyText}>현재 도움 요청이 없어요</Text>
                      </View>
                    );
                  }
                  return filtered.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={s.listCard}
                      activeOpacity={0.85}
                      onPress={() => goTo(item)}
                    >
                      <View style={s.listCardHeader}>
                        <View style={s.listCardLeft}>
                          <View style={s.listAvatar}>
                            {item.requester?.profileImage ? (
                              <Image source={{ uri: item.requester.profileImage }} style={s.listAvatarImg} />
                            ) : (
                              <Text style={s.listAvatarText}>{item.requester?.nickname?.charAt(0) ?? '?'}</Text>
                            )}
                          </View>
                          <View>
                            <Text style={s.listCardName}>{item.requester?.nickname ?? ''}</Text>
                            <Text style={s.listCardTime}>
                              {formatRelativeTime(item.createdAt)}
                            </Text>
                          </View>
                        </View>
                        <View style={s.listCardRight}>
                          <View style={[s.listMethodBadge, item.helpMethod === 'OFFLINE' ? s.listMethodOffline : s.listMethodOnline]}>
                            <Text style={[s.listMethodText, item.helpMethod === 'OFFLINE' ? s.listMethodOfflineText : s.listMethodOnlineText]}>
                              {item.helpMethod === 'OFFLINE' ? '오프라인' : '온라인'}
                            </Text>
                          </View>
                          <View style={s.listCatBadge}>
                            <Text style={s.listCatText}>{CAT_LABEL[item.category] ?? item.category}</Text>
                          </View>
                        </View>
                      </View>
                      <Text style={s.listCardTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={s.listCardDesc} numberOfLines={3} ellipsizeMode="tail">{item.description}</Text>
                      <TouchableOpacity style={s.listHelpBtn} activeOpacity={0.8} onPress={() => goTo(item)}>
                        <Text style={s.listHelpBtnText}>도와주기 ›</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ));
                })()}
              </View>
            )}
          </>
        ) : (
          <>
            {/* 카드 보기 / 리스트 보기 탭 */}
            <View style={s.viewTabRow}>
              <Animated.View style={[s.viewTabSlider, {
                left: tabAnim.interpolate({ inputRange: [0, 1], outputRange: ['2%', '53%'] }),
                width: '47%',
              }]} />
              <TouchableOpacity style={s.viewTab} onPress={() => switchTab('card')} activeOpacity={0.8}>
                <Ionicons name="layers-outline" size={14} color={viewMode === 'card' ? '#fff' : '#888'} />
                <Text style={[s.viewTabText, viewMode === 'card' && s.viewTabTextOn]}>카드 보기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.viewTab} onPress={() => switchTab('list')} activeOpacity={0.8}>
                <Ionicons name="list-outline" size={14} color={viewMode === 'list' ? '#fff' : '#888'} />
                <Text style={[s.viewTabText, viewMode === 'list' && s.viewTabTextOn]}>도움 목록 보기</Text>
              </TouchableOpacity>
            </View>
            {viewMode === 'card' ? (
              <View style={{ marginLeft: 16, marginBottom: 24 }}>
                <SwipeCardStack
                  requests={requests.filter(r => r.status === 'WAITING')}
                  onCardPress={(card) => goTo(card)}
                />
              </View>
            ) : (
              <View style={s.listViewWrap}>
                <View style={s.listFilterRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.listFilterScroll} style={{ maxWidth: 260 }}>
                    {([
                      { key: 'ALL',         label: '전체' },
                      { key: 'WAITING',     label: '최신' },
                      { key: 'IN_PROGRESS', label: '매칭중' },
                      { key: 'COMPLETED',   label: '완료' },
                    ] as const).map(({ key, label }) => (
                      <TouchableOpacity
                        key={key}
                        style={[s.listFilterChip, statusFilter === key && s.listFilterChipOn]}
                        onPress={() => setStatusFilter(key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.listFilterChipText, statusFilter === key && s.listFilterChipTextOn]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={s.searchBox}>
                    <Ionicons name="search-outline" size={15} color={T2} />
                    <TextInput
                      style={s.searchInput}
                      placeholder="검색"
                      placeholderTextColor={T2}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                        <Ionicons name="close-circle" size={15} color={T2} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {(() => {
                  const CAT_LABEL: Record<HelpCategory, string> = {
                    BANK: '은행', HOSPITAL: '병원', SCHOOL: '학교', DAILY: '일상', OTHER: '기타',
                  };
                  const filtered = requests
                    .filter(r => statusFilter === 'ALL'
                      ? (r.status === 'WAITING' || r.status === 'IN_PROGRESS' || r.status === 'COMPLETED')
                      : r.status === statusFilter
                    )
                    .filter(r => searchQuery.trim() === '' ||
                      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (r.requester?.nickname ?? '').toLowerCase().includes(searchQuery.toLowerCase())
                    );
                  if (filtered.length === 0) {
                    return (
                      <View style={s.listEmpty}>
                        <Text style={s.listEmptyText}>현재 도움 요청이 없어요</Text>
                      </View>
                    );
                  }
                  return filtered.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={s.listCard}
                      activeOpacity={0.85}
                      onPress={() => goTo(item)}
                    >
                      <View style={s.listCardHeader}>
                        <View style={s.listCardLeft}>
                          <View style={s.listAvatar}>
                            {item.requester?.profileImage ? (
                              <Image source={{ uri: item.requester.profileImage }} style={s.listAvatarImg} />
                            ) : (
                              <Text style={s.listAvatarText}>{item.requester?.nickname?.charAt(0) ?? '?'}</Text>
                            )}
                          </View>
                          <View>
                            <Text style={s.listCardName}>{item.requester?.nickname ?? ''}</Text>
                            <Text style={s.listCardTime}>
                              {formatRelativeTime(item.createdAt)}
                            </Text>
                          </View>
                        </View>
                        <View style={s.listCardRight}>
                          <View style={[s.listMethodBadge, item.helpMethod === 'OFFLINE' ? s.listMethodOffline : s.listMethodOnline]}>
                            <Text style={[s.listMethodText, item.helpMethod === 'OFFLINE' ? s.listMethodOfflineText : s.listMethodOnlineText]}>
                              {item.helpMethod === 'OFFLINE' ? '오프라인' : '온라인'}
                            </Text>
                          </View>
                          <View style={s.listCatBadge}>
                            <Text style={s.listCatText}>{CAT_LABEL[item.category] ?? item.category}</Text>
                          </View>
                        </View>
                      </View>
                      <Text style={s.listCardTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={s.listCardDesc} numberOfLines={3} ellipsizeMode="tail">{item.description}</Text>
                      <TouchableOpacity style={s.listHelpBtn} activeOpacity={0.8} onPress={() => goTo(item)}>
                        <Text style={s.listHelpBtnText}>도와주기 ›</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ));
                })()}
              </View>
            )}
          </>
        )}



      </ScrollView>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center:    { paddingVertical: 60, alignItems: 'center' },

  // ── NAV ──
  nav: {
    paddingTop: 16,
    paddingBottom: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  shortcutLabelLg: { fontSize: 14, fontWeight: '700', color: '#333' },
  shortcutDivider: { width: 1, backgroundColor: DIV, alignSelf: 'stretch', marginTop: -16, marginBottom: -18 },

  // ── 유학생 요청 현황 ──
  requestStatRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  requestStatItem: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  requestStatNum:   { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  requestStatLabel: { fontSize: 12, fontWeight: '700' },

  // ── 유학생 요청 현황 (글라스) ──
  requestStatGlass: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 18,
    padding: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.90)',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 10,
  },
  requestStatGlassTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(30, 60, 120, 0.85)',
    paddingLeft: 10,
    paddingTop: 8,
    paddingBottom: 2,
  },

  // ── 유학생 요청 현황 (슬림) ──
  activityHeaderSlim: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  requestStatRowSlim: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
  },
  requestStatItemSlim: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  requestStatNumSlim:   { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  requestStatLabelSlim: { fontSize: 12, fontWeight: '700' },

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

  // ── 상단 요약 카드 (슬라이드) ──
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 12,
  },
  summaryWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryInner: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryScroll: {},
  summarySlide: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    width: '100%',
  },
  summaryDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingBottom: 8,
  },
  summaryDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D0D8E8',
  },
  summaryDotActive: {
    width: 14,
    backgroundColor: BLUE,
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

  // ── 연속 도움중 카드 ──
  streakCard: {
    marginHorizontal: 16, marginBottom: 10, marginTop: 8,
    backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  streakTopRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, gap: 12,
    height: 58,
  },
  streakTextWrap: { flex: 1 },
  streakTitle:    { fontSize: 19, fontWeight: '800', color: T1 },
  streakSub:      { fontSize: 11, color: T2 },
  streakDots:     { flexDirection: 'row', gap: 4 },
  streakDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E8EDF5' },
  streakDotOn:    { backgroundColor: BLUE },
  streakSlide2Row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakSlide2Text: { fontSize: 19, fontWeight: '800', color: T1 },
  streakSlide2Badge: { backgroundColor: BLUE, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, minWidth: 26, alignItems: 'center' },
  streakSlide2BadgeText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  streakProgressWrap: { paddingHorizontal: 14, paddingBottom: 10 },
  streakProgressLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5,
  },
  streakProgressLabel: { fontSize: 11, color: T2, fontWeight: '600' },
  streakProgressCount: { fontSize: 11, color: T2, fontWeight: '700' },
  streakProgressTrack: {
    height: 5, borderRadius: 5, backgroundColor: '#F0F2F6', overflow: 'hidden',
  },
  streakProgressFill:  { height: '100%', borderRadius: 5, backgroundColor: BLUE },
  streakHelpHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  streakHelpTitle:     { fontSize: 14, fontWeight: '700', color: T1 },
  streakSlideWrap: {
    height: 80, justifyContent: 'center',
  },
  streakStatRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  streakStatItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 10,
  },
  streakStatNum:   { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  streakStatLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  streakCtaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  streakCtaIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: BLUE_L, alignItems: 'center', justifyContent: 'center',
  },
  streakCtaTextWrap: { flex: 1 },
  streakCtaTitle: { fontSize: 14, fontWeight: '800', color: T1 },
  streakCtaSub:   { fontSize: 11, color: T2, marginTop: 2 },
  helpTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  helpTitleBoxText: { fontSize: 15, fontWeight: '800', color: T1, flex: 1 },

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

  // ── 오늘 학식 ──
  mealSection:  { marginTop: 8, marginBottom: 24 },
  sectionBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionBoxInner: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  sectionBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  mealScroll:   {},
  mealEmpty:    { paddingVertical: 20, paddingHorizontal: 16 },
  mealCard: {
    backgroundColor: '#fff',
    padding: 16,
    gap: 6,
  },
  mealCardTop:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  mealIconWrap: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: BLUE_L,
    alignItems: 'center', justifyContent: 'center',
  },
  mealCafeteria: { fontSize: 12, fontWeight: '800', color: BLUE, flex: 1 },
  mealCorner:    { fontSize: 11, fontWeight: '600', color: T2 },
  mealMenu:      { fontSize: 12, color: T1, fontWeight: '500', lineHeight: 18 },

  // ── 카드/리스트 보기 탭 ──
  viewTabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 40,
    padding: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  viewTabSlider: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: BLUE,
    borderRadius: 36,
  },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 36,
    zIndex: 1,
  },
  viewTabText:   { fontSize: 15, fontWeight: '700', color: '#999' },
  viewTabTextOn: { color: '#fff' },

  // ── 리스트 뷰 ──
  listViewWrap: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  listEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  listEmptyText: { fontSize: 14, color: T2 },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: BLUE_L,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2, borderColor: '#E0E0E0',
  },
  listAvatarImg: { width: 42, height: 42, borderRadius: 21 },
  listAvatarText:  { fontSize: 13, fontWeight: '700', color: BLUE },
  listCardName:    { fontSize: 13, fontWeight: '700', color: T1 },
  listCardTime:    { fontSize: 11, color: T2, marginTop: 1 },
  listCatBadge: {
    backgroundColor: BLUE_L,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  listCatText:    { fontSize: 11, fontWeight: '800', color: BLUE },
  listCardTitle:  { fontSize: 15, fontWeight: '700', color: T1, lineHeight: 22 },
  listLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listLocationText: { fontSize: 12, color: T2 },
  listHelpBtn: {
    alignSelf: 'flex-end',
    backgroundColor: BLUE,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: -20,
    marginRight: -6,
  },
  listHelpBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  listCardDesc: { fontSize: 13, color: T2, lineHeight: 19 },
  listCardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listMethodRow: { flexDirection: 'row', alignItems: 'center' },
  listMethodBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  listMethodOffline: { backgroundColor: '#FFF3E0' },
  listMethodOnline:  { backgroundColor: '#EEF4FF' },
  listMethodText: { fontSize: 11, fontWeight: '700' },
  listMethodOfflineText: { color: ORANGE },
  listMethodOnlineText:  { color: BLUE },
  listFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  listFilterScroll: { gap: 6, alignItems: 'center' },
  listFilterChip: {
    width: 58,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listFilterChipOn:      { backgroundColor: BLUE },
  listFilterChipText:    { fontSize: 12, fontWeight: '700', color: '#888' },
  listFilterChipTextOn:  { color: '#fff' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flex: 1,
  },
  searchInput: { flex: 1, fontSize: 12, color: T1, padding: 0 },

  // ── 유학생 슬라이드 보기 ──
  intlSlideScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  intlSlideEmpty:  { paddingVertical: 40, paddingHorizontal: 16, alignItems: 'center' },
  intlSlideCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  intlSlideAvatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  intlSlideAvatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  intlSlideLvBadge: {
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  intlSlideLvText:    { fontSize: 11, fontWeight: '700', color: '#fff' },
  intlSlideName:      { fontSize: 14, fontWeight: '800', color: T1, textAlign: 'center' },
  intlSlideMajor:     { fontSize: 11, color: T2, fontWeight: '500', textAlign: 'center' },
  intlSlideStatsRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  intlSlideStats:     { fontSize: 11, color: T2, fontWeight: '600' },
  intlSlideStatsDot:  { fontSize: 11, color: T2 },
  intlSlideBtn: {
    marginTop: 4,
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  intlSlideBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});

