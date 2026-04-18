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
import ForeignAccountCardStack from '../../components/ForeignAccountCardStack';
import KoreanAccountCardStack from '../../components/KoreanAccountCardStack';
import WriteForm from '../../components/WriteForm';
import { s as sc } from '../../utils/scale';
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
  const [searchField, setSearchField]        = useState<'ALL' | 'TITLE' | 'CONTENT'>('ALL');
  const [statusFilter, setStatusFilter]      = useState<'ALL' | 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'ONLINE' | 'OFFLINE'>('WAITING');
  const [intlTab, setIntlTab]                = useState<'card' | 'write' | 'list'>('card');
  const tabAnim                              = useRef(new Animated.Value(0)).current;
  const intlTabAnim                          = useRef(new Animated.Value(0)).current;

  const koreanCardY = useRef(0);
  const switchTab = useCallback((mode: 'card' | 'list') => {
    setViewMode(mode);
    Animated.spring(tabAnim, {
      toValue: mode === 'card' ? 0 : 1,
      useNativeDriver: false,
      friction: 10,
      tension: 35,
    }).start();
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: mode === 'card' ? 0 : koreanCardY.current - 70, animated: true });
    }, 50);
  }, [tabAnim]);

  const intlCardY = useRef(0);
  const currentScrollY = useRef(0);
  const switchIntlTab = useCallback((mode: 'card' | 'write' | 'list') => {
    setIntlTab(mode);
    Animated.spring(intlTabAnim, {
      toValue: mode === 'card' ? 0 : mode === 'write' ? 1 : 2,
      useNativeDriver: false,
      friction: 10,
      tension: 35,
    }).start();
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: intlCardY.current - 60, animated: true });
    }, 50);
  }, [intlTabAnim]);
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
        scrollEventThrottle={16}
        onScroll={e => { currentScrollY.current = e.nativeEvent.contentOffset.y; }}
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
            <View
              style={s.viewTabRow}
              onLayout={e => { intlCardY.current = e.nativeEvent.layout.y; }}
            >
              <Animated.View style={[s.viewTabSlider, {
                left: intlTabAnim.interpolate({ inputRange: [0, 1, 2], outputRange: ['2%', '36%', '69%'] }),
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
            <View style={{ display: intlTab === 'card' ? 'flex' : 'none', marginLeft: 6, marginBottom: 10 }}>
              <ForeignAccountCardStack
                users={koreanUsers}
                onPress={() => switchIntlTab('write')}
              />
            </View>
            <View style={{ display: intlTab === 'write' ? 'flex' : 'none' }}>
              <WriteForm onSuccess={() => switchIntlTab('list')} />
            </View>
            <View style={{ display: intlTab === 'list' ? 'flex' : 'none' }}>
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
            </View>
          </>
        ) : (
          <>
            {/* 카드 보기 / 리스트 보기 탭 */}
            <View
              style={s.viewTabRow}
              onLayout={e => { koreanCardY.current = e.nativeEvent.layout.y; }}
            >
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
            <View style={{ display: viewMode === 'card' ? 'flex' : 'none', marginLeft: 6, marginBottom: 24 }}>
              <KoreanAccountCardStack
                requests={requests.filter(r => r.status === 'WAITING')}
                onCardPress={(card) => goTo(card)}
                onAccept={(card) => goTo(card)}
              />
            </View>
            <View style={{ display: viewMode === 'list' ? 'flex' : 'none' }}>
              <View style={s.listViewWrap}>
                <View style={{ position: 'relative' }}>
                  {/* 검색 필드 필터 */}
                  <TouchableOpacity
                    style={[s.searchFieldToggle, s.searchFieldBtn, s.searchFieldBtnOn]}
                    onPress={() => {
                      setSearchField(f => f === 'ALL' ? 'TITLE' : f === 'TITLE' ? 'CONTENT' : 'ALL');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={s.searchFieldBtnTextOn}>
                      {searchField === 'ALL' ? '전체' : searchField === 'TITLE' ? '제목' : '본문'}
                    </Text>
                  </TouchableOpacity>
                  {/* 검색창 */}
                  <View style={[s.searchBox, { marginLeft: sc(70), marginRight: sc(30) }]}>
                    <Ionicons name="search-outline" size={15} color={T2} />
                    <TextInput
                      style={s.searchInput}
                      placeholder={searchField === 'TITLE' ? '제목 검색' : searchField === 'CONTENT' ? '본문 검색' : '전체 검색'}
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
                <View style={[s.listFilterRow, { paddingLeft: sc(0) }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.listFilterScroll}>
                    {([
                      { key: 'WAITING',     label: '전체' },
                      { key: 'IN_PROGRESS', label: '매칭중' },
                      { key: 'COMPLETED',   label: '완료' },
                      { key: 'ONLINE',      label: '온라인' },
                      { key: 'OFFLINE',     label: '오프라인' },
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
                </View>
                {(() => {
                  const CAT_LABEL: Record<HelpCategory, string> = {
                    BANK: '은행', HOSPITAL: '병원', SCHOOL: '학교', DAILY: '일상', OTHER: '기타',
                  };
                  const filtered = requests
                    .filter(r => {
                      if (statusFilter === 'ALL' || statusFilter === 'WAITING') return r.status === 'WAITING' || r.status === 'IN_PROGRESS' || r.status === 'COMPLETED';
                      if (statusFilter === 'ONLINE') return r.helpMethod === 'CHAT' || r.helpMethod === 'VIDEO_CALL';
                      if (statusFilter === 'OFFLINE') return r.helpMethod === 'OFFLINE';
                      return r.status === statusFilter;
                    })
                    .filter(r => {
                      const kw = searchQuery.trim().toLowerCase();
                      if (!kw) return true;
                      if (searchField === 'TITLE') return r.title.toLowerCase().includes(kw);
                      if (searchField === 'CONTENT') return r.description.toLowerCase().includes(kw);
                      return r.title.toLowerCase().includes(kw) || r.description.toLowerCase().includes(kw);
                    });
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
            </View>
          </>
        )}



      </ScrollView>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center:    { paddingVertical: sc(60), alignItems: 'center' },

  // ── NAV ──
  nav: {
    paddingTop: sc(16),
    paddingBottom: sc(10),
    paddingHorizontal: sc(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navLeft:      { flexDirection: 'row', alignItems: 'center', gap: sc(8) },
  navRight:     { flexDirection: 'row', alignItems: 'center', gap: sc(10) },
  navGridBtn: {
    width: sc(32), height: sc(32), borderRadius: sc(10),
    backgroundColor: '#E2E3E8',
    justifyContent: 'center', alignItems: 'center',
  },
  navTitle:     { flexDirection: 'row', alignItems: 'center', gap: sc(3) },
  navTitleText:     { fontSize: sc(15), fontWeight: '700', color: T1 },
  navGreeting:      { fontSize: sc(20), fontWeight: '900', color: T1, letterSpacing: -0.5 },
  navGreetingName:  { color: BLUE },
  matchBtn: {
    backgroundColor: '#E2E3E8',
    borderRadius: sc(20), paddingHorizontal: sc(16), paddingVertical: sc(7),
  },
  matchBtnText: { fontSize: sc(13), fontWeight: '700', color: '#333' },
  notifBtn:     { position: 'relative', width: sc(36), height: sc(36), justifyContent: 'center', alignItems: 'center' },
  notifDot: {
    position: 'absolute', top: 4, right: 4,
    width: sc(8), height: sc(8), borderRadius: sc(4),
    backgroundColor: ORANGE, borderWidth: 1.5, borderColor: BG,
  },

  // ── Hero (슬라이드 카드 내 히어로 컨텐츠용) ──
  heroLocationRow: { flexDirection: 'row', alignItems: 'center', gap: sc(5), marginBottom: sc(10) },
  heroDot:    { width: sc(6), height: sc(6), borderRadius: sc(3), backgroundColor: '#22C55E' },
  heroLocation: { fontSize: sc(12), color: '#6B9DF0', fontWeight: '600' },
  heroTitle:  { fontSize: sc(22), fontWeight: '900', color: T1, letterSpacing: -0.5, marginBottom: sc(10) },
  heroHL:     { color: BLUE },
  heroSub:    { fontSize: sc(12), color: T2, fontWeight: '500' },
  heroUrgent: { fontSize: sc(12), color: ORANGE, fontWeight: '700', marginTop: sc(4) },
  heroBottom: { padding: sc(12), paddingTop: sc(10) },
  heroBtn: {
    backgroundColor: BLUE, borderRadius: sc(14), padding: sc(15),
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sc(6),
  },
  heroBtnText:          { fontSize: sc(15), fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  heroProgressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: sc(5), marginTop: sc(10) },
  heroProgressLabel:    { fontSize: sc(11), color: '#6B9DF0', fontWeight: '500' },
  heroProgressValue:    { fontSize: sc(11), color: BLUE, fontWeight: '700' },
  heroProgressTrack:    { backgroundColor: '#D4E4FA', borderRadius: sc(10), height: sc(6), overflow: 'hidden' },
  heroProgressFill:     { backgroundColor: BLUE, borderRadius: sc(10), height: '100%' },


  // ── Section Card ──
  sectionCard: {
    marginHorizontal: sc(16), marginBottom: sc(8),
    backgroundColor: '#fff', borderRadius: sc(20),
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(4) },
    shadowOpacity: 0.12, shadowRadius: sc(12), elevation: 6,
  },
  sectionHeader: {
    padding: sc(18), paddingBottom: sc(14),
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: DIV,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: sc(10) },
  sectionIcon: {
    width: sc(38), height: sc(38), borderRadius: sc(12),
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: sc(15), fontWeight: '800', color: T1 },

  // ── 카테고리 ──
  catGrid: {
    flexDirection: 'row',
    padding: sc(16), paddingBottom: 0,
    justifyContent: 'space-between',
  },
  catItem:    { alignItems: 'center', gap: sc(7) },
  catIcon: {
    width: sc(48), height: sc(48), borderRadius: sc(15),
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  catIconOn:  { backgroundColor: BLUE },
  catEmoji:   { fontSize: sc(22) },
  catLabel:   { fontSize: sc(11), fontWeight: '600', color: '#333' },
  catLabelOn: { color: BLUE, fontWeight: '800' },

  sectionFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: DIV,
    padding: sc(14), paddingHorizontal: sc(20), marginTop: sc(14),
  },
  sectionCount:    { fontSize: sc(24), fontWeight: '900', color: T1, letterSpacing: -0.8 },
  sectionCountSub: { fontSize: sc(12), color: T2, marginTop: sc(2) },
  historyBtn: {
    backgroundColor: '#EDEEF2', borderRadius: sc(10),
    paddingHorizontal: sc(16), paddingVertical: sc(8),
  },
  historyBtnText: { fontSize: sc(12), fontWeight: '700', color: '#555' },

  // ── 내 활동 ──
  activityHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: sc(14), paddingBottom: sc(10),
  },
  activitySub: { fontSize: sc(12), color: T2, marginTop: sc(3) },
  nuanceBadge: {
    backgroundColor: '#FFF3E0', borderRadius: sc(20),
    paddingHorizontal: sc(13), paddingVertical: sc(5),
  },
  nuanceBadgeText: { fontSize: sc(11), fontWeight: '800', color: ORANGE },
  levelBadge:     { borderRadius: sc(10), borderWidth: 1.5, width: sc(58), height: sc(32), alignItems: 'center', justifyContent: 'center' },
  levelBadgeText: { fontSize: sc(13), fontWeight: '800' },
  ratingRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: sc(14),
    paddingHorizontal: sc(14), marginBottom: sc(10),
  },
  ratingNum:  { fontSize: sc(44), fontWeight: '900', color: T1, letterSpacing: -2, lineHeight: sc(44) },
  starsRow:   { flexDirection: 'row', gap: sc(3), marginBottom: sc(5) },
  ratingSub:  { fontSize: sc(11), color: T2 },
  progressTrack: {
    height: sc(6), borderRadius: sc(6),
    backgroundColor: '#F0F2F6',
    marginHorizontal: sc(18), marginBottom: sc(18), overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: BLUE, borderRadius: sc(6) },
  activityShortcuts: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: DIV,
    paddingTop: sc(10), paddingBottom: sc(12), paddingHorizontal: sc(10),
  },
  shortcut:      { flex: 1, alignItems: 'center', gap: sc(6) },
  shortcutIcon: {
    width: sc(42), height: sc(42), borderRadius: sc(13),
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  shortcutLabel:   { fontSize: sc(11), fontWeight: '600', color: '#333' },
  shortcutLabelLg: { fontSize: sc(14), fontWeight: '700', color: '#333' },
  shortcutDivider: { width: 1, backgroundColor: DIV, alignSelf: 'stretch', marginTop: -16, marginBottom: -18 },

  // ── 유학생 요청 현황 ──
  requestStatRow: {
    flexDirection: 'row',
    gap: sc(10),
    paddingHorizontal: sc(14),
    paddingTop: sc(10),
    paddingBottom: sc(14),
  },
  requestStatItem: {
    flex: 1,
    borderRadius: sc(14),
    paddingVertical: sc(14),
    alignItems: 'center',
    gap: sc(4),
  },
  requestStatNum:   { fontSize: sc(28), fontWeight: '900', letterSpacing: -1 },
  requestStatLabel: { fontSize: sc(12), fontWeight: '700' },

  // ── 유학생 요청 현황 (글라스) ──
  requestStatGlass: {
    marginHorizontal: sc(16),
    marginBottom: sc(8),
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: sc(18),
    padding: sc(4),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.90)',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: sc(6) },
    shadowOpacity: 0.28,
    shadowRadius: sc(16),
    elevation: 10,
  },
  requestStatGlassTitle: {
    fontSize: sc(13),
    fontWeight: '800',
    color: 'rgba(30, 60, 120, 0.85)',
    paddingLeft: sc(10),
    paddingTop: sc(8),
    paddingBottom: sc(2),
  },

  // ── 유학생 요청 현황 (슬림) ──
  activityHeaderSlim: {
    paddingHorizontal: sc(14),
    paddingTop: sc(10),
    paddingBottom: sc(6),
  },
  requestStatRowSlim: {
    flexDirection: 'row',
    gap: sc(8),
    paddingHorizontal: sc(14),
    paddingTop: sc(4),
    paddingBottom: sc(10),
  },
  requestStatItemSlim: {
    flex: 1,
    borderRadius: sc(10),
    paddingVertical: sc(13),
    paddingHorizontal: sc(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sc(6),
  },
  requestStatNumSlim:   { fontSize: sc(20), fontWeight: '900', letterSpacing: -0.5 },
  requestStatLabelSlim: { fontSize: sc(12), fontWeight: '700' },

  // ── 필터 & 카드 ──
  filterRow: { flexDirection: 'row', gap: sc(6), padding: sc(16), paddingBottom: sc(12) },
  chip: {
    paddingHorizontal: sc(16), paddingVertical: sc(8),
    borderRadius: sc(20), backgroundColor: '#F4F5F8',
  },
  chipOn:     { backgroundColor: BLUE },
  chipUrgent: { backgroundColor: ORANGE },
  chipText:   { fontSize: sc(13), fontWeight: '700', color: '#888' },
  chipTextOn: { color: '#fff' },
  cardList:   { gap: 0, paddingHorizontal: sc(16), paddingBottom: sc(16) },

  // ── Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: sc(16),
    borderWidth: 1, borderColor: '#F0F2F6',
    flexDirection: 'row', marginBottom: sc(10),
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
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
  avatarImg:   { width: sc(22), height: sc(22), borderRadius: sc(11), flexShrink: 0 },
  avatarText:  { fontSize: sc(10), color: '#fff', fontWeight: '700' },
  schoolText:  { fontSize: sc(13), color: T2, fontWeight: '500', flex: 1 },
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

  // ── FAB ──
  fab: {
    position: 'absolute', bottom: 16, right: 20,
    borderRadius: sc(28), paddingHorizontal: sc(20), paddingVertical: sc(14),
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: BLUE, shadowOffset: { width: 0, height: sc(4) },
    shadowOpacity: 0.35, shadowRadius: sc(10), elevation: 8,
    zIndex: 10,
  },
  fabText: { fontSize: sc(15), fontWeight: '800', color: '#fff' },

  // ── Empty ──
  empty:      { alignItems: 'center', paddingVertical: sc(40), gap: sc(8) },
  emptyEmoji: { fontSize: sc(40), marginBottom: sc(4) },
  emptyTitle: { fontSize: sc(16), fontWeight: '700', color: T1 },
  emptySub:   { fontSize: sc(14), color: T2 },

  // ── 상단 요약 카드 (슬라이드) ──
  summaryRow: {
    flexDirection: 'row',
    gap: sc(10),
    marginHorizontal: sc(16),
    marginBottom: sc(16),
    marginTop: sc(12),
  },
  summaryWrapper: {
    marginHorizontal: sc(16),
    marginBottom: sc(16),
    marginTop: sc(12),
    borderRadius: sc(16),
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: sc(6),
    elevation: 2,
  },
  summaryInner: {
    borderRadius: sc(16),
    overflow: 'hidden',
  },
  summaryScroll: {},
  summarySlide: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sc(14),
    gap: sc(10),
    width: '100%',
  },
  summaryDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryDot: {
    width: sc(5),
    height: sc(5),
    borderRadius: sc(3),
    backgroundColor: '#D0D8E8',
  },
  summaryDotActive: {
    width: sc(14),
    backgroundColor: BLUE,
  },
  summaryIconWrap: {
    width: sc(32),
    height: sc(32),
    borderRadius: sc(10),
    backgroundColor: BLUE_L,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextWrap: { flex: 1 },
  summaryLabel:    { fontSize: sc(11), color: T2, fontWeight: '600', marginBottom: sc(2) },
  summaryValue:    { fontSize: sc(12), color: T1, fontWeight: '700' },

  // ── 연속 도움중 카드 ──
  streakCard: {
    marginHorizontal: sc(16), marginBottom: sc(10), marginTop: sc(8),
    backgroundColor: '#fff', borderRadius: sc(16),
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(2) },
    shadowOpacity: 0.1, shadowRadius: sc(8), elevation: 3,
  },
  streakTopRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: sc(14), paddingTop: sc(14), paddingBottom: sc(8), gap: sc(12),
    height: sc(58),
  },
  streakTextWrap: { flex: 1 },
  streakTitle:    { fontSize: sc(19), fontWeight: '800', color: T1 },
  streakSub:      { fontSize: sc(11), color: T2 },
  streakDots:     { flexDirection: 'row', gap: sc(4) },
  streakDot:      { width: sc(6), height: sc(6), borderRadius: sc(3), backgroundColor: '#E8EDF5' },
  streakDotOn:    { backgroundColor: BLUE },
  streakSlide2Row: { flexDirection: 'row', alignItems: 'center', gap: sc(6) },
  streakSlide2Text: { fontSize: sc(19), fontWeight: '800', color: T1 },
  streakSlide2Badge: { backgroundColor: BLUE, borderRadius: sc(12), paddingHorizontal: sc(8), paddingVertical: sc(2), minWidth: sc(26), alignItems: 'center' },
  streakSlide2BadgeText: { fontSize: sc(14), fontWeight: '800', color: '#fff' },
  streakProgressWrap: { paddingHorizontal: sc(14), paddingBottom: sc(10) },
  streakProgressLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sc(5),
  },
  streakProgressLabel: { fontSize: sc(11), color: T2, fontWeight: '600' },
  streakProgressCount: { fontSize: sc(11), color: T2, fontWeight: '700' },
  streakProgressTrack: {
    height: sc(5), borderRadius: sc(5), backgroundColor: '#F0F2F6', overflow: 'hidden',
  },
  streakProgressFill:  { height: '100%', borderRadius: sc(5), backgroundColor: BLUE },
  streakHelpHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: sc(6), marginTop: sc(4) },
  streakHelpTitle:     { fontSize: sc(14), fontWeight: '700', color: T1 },
  streakSlideWrap: {
    height: sc(80), justifyContent: 'center',
  },
  streakStatRow: {
    flexDirection: 'row', gap: sc(8),
    paddingHorizontal: sc(14), paddingVertical: sc(14),
  },
  streakStatItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: sc(12), paddingVertical: sc(10),
  },
  streakStatNum:   { fontSize: sc(22), fontWeight: '900', letterSpacing: -0.5 },
  streakStatLabel: { fontSize: sc(11), fontWeight: '700', marginTop: sc(2) },
  streakCtaRow: {
    flexDirection: 'row', alignItems: 'center', gap: sc(10),
    paddingHorizontal: sc(14), paddingVertical: sc(14),
  },
  streakCtaIconWrap: {
    width: sc(38), height: sc(38), borderRadius: sc(12),
    backgroundColor: BLUE_L, alignItems: 'center', justifyContent: 'center',
  },
  streakCtaTextWrap: { flex: 1 },
  streakCtaTitle: { fontSize: sc(14), fontWeight: '800', color: T1 },
  streakCtaSub:   { fontSize: sc(11), color: T2, marginTop: sc(2) },
  helpTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sc(8),
    marginHorizontal: sc(16),
    marginBottom: sc(10),
    backgroundColor: '#fff',
    borderRadius: sc(12),
    paddingHorizontal: sc(16),
    paddingVertical: sc(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: sc(4),
    elevation: 2,
  },
  helpTitleBoxText: { fontSize: sc(15), fontWeight: '800', color: T1, flex: 1 },

  // ── 지금 도움이 필요해요 헤더 ──
  helpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: sc(20),
    marginBottom: sc(12),
  },
  helpHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: sc(8) },
  helpHeaderTitle: { fontSize: sc(17), fontWeight: '900', color: T1, letterSpacing: -0.4 },
  helpCountBadge: {
    backgroundColor: ORANGE,
    borderRadius: sc(12),
    minWidth: sc(22),
    height: sc(22),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sc(6),
  },
  helpCountText:  { fontSize: sc(12), fontWeight: '800', color: '#fff' },
  helpHeaderLink: { fontSize: sc(13), fontWeight: '700', color: BLUE },

  // ── 핫한 게시글 ──
  hotSection:    { marginTop: sc(8), marginBottom: sc(16) },
  hotHeader:     { flexDirection: 'row', alignItems: 'center', marginHorizontal: sc(20), marginBottom: sc(12) },
  hotHeaderEmoji:{ fontSize: sc(16), marginRight: sc(4) },
  hotHeaderTitle:{ fontSize: sc(17), fontWeight: '900', color: T1, letterSpacing: -0.4, flex: 1 },
  hotMoreBtn:    {},
  hotMoreText:   { fontSize: sc(13), fontWeight: '700', color: BLUE },
  hotScroll:     { paddingHorizontal: sc(16), gap: sc(10) },
  hotEmpty:      { paddingVertical: sc(20), paddingHorizontal: sc(16) },
  hotEmptyText:  { fontSize: sc(13), color: T2 },
  hotCard: {
    width: sc(180),
    backgroundColor: '#fff',
    borderRadius: sc(16),
    padding: sc(14),
    borderWidth: 1,
    borderColor: '#F0F2F6',
    gap: sc(6),
  },
  hotCardTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hotCatBadge:   { borderRadius: sc(8), paddingHorizontal: sc(8), paddingVertical: sc(3) },
  hotCatText:    { fontSize: sc(11), fontWeight: '800' },
  hotFire:       { fontSize: sc(13) },
  hotTitle:      { fontSize: sc(13), fontWeight: '700', color: T1, lineHeight: sc(18) },
  hotContent:    { fontSize: sc(11), color: T2, lineHeight: sc(16) },
  hotCardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: sc(4), gap: sc(5) },
  hotAvatar:     { width: sc(20), height: sc(20), borderRadius: sc(10), alignItems: 'center', justifyContent: 'center' },
  hotAvatarText: { fontSize: sc(9), color: '#fff', fontWeight: '700' },
  hotAuthor:     { fontSize: sc(11), color: T2, fontWeight: '600', flex: 1 },
  hotStats:      { flexDirection: 'row', alignItems: 'center', gap: sc(2) },
  hotStatText:   { fontSize: sc(11), color: T2, fontWeight: '600' },

  // ── 오늘 학식 ──
  mealSection:  { marginTop: sc(8), marginBottom: sc(24) },
  sectionBox: {
    marginHorizontal: sc(16),
    marginBottom: sc(16),
    borderRadius: sc(20),
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: sc(2) },
    shadowOpacity: 0.09,
    shadowRadius: sc(10),
    elevation: 3,
  },
  sectionBoxInner: {
    borderRadius: sc(20),
    overflow: 'hidden',
  },
  sectionBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: sc(16),
    paddingTop: sc(16),
    paddingBottom: sc(12),
  },
  mealScroll:   {},
  mealEmpty:    { paddingVertical: sc(20), paddingHorizontal: sc(16) },
  mealCard: {
    backgroundColor: '#fff',
    padding: sc(16),
    gap: sc(6),
  },
  mealCardTop:   { flexDirection: 'row', alignItems: 'center', gap: sc(6), marginBottom: sc(2) },
  mealIconWrap: {
    width: sc(24), height: sc(24), borderRadius: sc(8),
    backgroundColor: BLUE_L,
    alignItems: 'center', justifyContent: 'center',
  },
  mealCafeteria: { fontSize: sc(12), fontWeight: '800', color: BLUE, flex: 1 },
  mealCorner:    { fontSize: sc(11), fontWeight: '600', color: T2 },
  mealMenu:      { fontSize: sc(12), color: T1, fontWeight: '500', lineHeight: sc(18) },

  // ── 카드/리스트 보기 탭 ──
  viewTabRow: {
    flexDirection: 'row',
    marginHorizontal: sc(16),
    marginTop: sc(10),
    marginBottom: sc(12),
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: sc(40),
    padding: sc(4),
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: sc(8) },
    shadowOpacity: 0.15,
    shadowRadius: sc(24),
    elevation: 16,
  },
  viewTabSlider: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    backgroundColor: BLUE,
    borderRadius: 999,
  },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sc(5),
    paddingVertical: sc(11),
    borderRadius: sc(36),
    zIndex: 1,
  },
  viewTabText:   { fontSize: sc(15), fontWeight: '700', color: '#999' },
  viewTabTextOn: { color: '#fff' },

  // ── 리스트 뷰 ──
  listViewWrap: {
    paddingHorizontal: sc(16),
    gap: sc(10),
    marginBottom: sc(10),
  },
  listEmpty: {
    paddingVertical: sc(40),
    alignItems: 'center',
  },
  listEmptyText: { fontSize: sc(14), color: T2 },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: sc(16),
    paddingHorizontal: sc(14),
    paddingVertical: sc(9),
    gap: sc(5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: sc(2) },
    shadowOpacity: 0.08,
    shadowRadius: sc(8),
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
    gap: sc(8),
  },
  listAvatar: {
    width: sc(42), height: sc(42), borderRadius: sc(21),
    backgroundColor: BLUE_L,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2, borderColor: '#E0E0E0',
  },
  listAvatarImg: { width: sc(42), height: sc(42), borderRadius: sc(21) },
  listAvatarText:  { fontSize: sc(13), fontWeight: '700', color: BLUE },
  listCardName:    { fontSize: sc(13), fontWeight: '700', color: T1 },
  listCardTime:    { fontSize: sc(11), color: T2, marginTop: sc(1) },
  listCatBadge: {
    backgroundColor: BLUE_L,
    borderRadius: sc(8),
    paddingHorizontal: sc(9),
    paddingVertical: sc(3),
  },
  listCatText:    { fontSize: sc(11), fontWeight: '800', color: BLUE },
  listCardTitle:  { fontSize: sc(15), fontWeight: '700', color: T1, lineHeight: sc(22) },
  listLocationRow: { flexDirection: 'row', alignItems: 'center', gap: sc(4) },
  listLocationText: { fontSize: sc(12), color: T2 },
  listHelpBtn: {
    alignSelf: 'flex-end',
    backgroundColor: BLUE,
    borderRadius: sc(20),
    paddingHorizontal: sc(16),
    paddingVertical: sc(8),
    marginTop: -20,
    marginRight: -6,
  },
  listHelpBtnText: { fontSize: sc(13), fontWeight: '800', color: '#fff' },
  listCardDesc: { fontSize: sc(13), color: T2, lineHeight: sc(19) },
  listCardRight: { flexDirection: 'row', alignItems: 'center', gap: sc(6) },
  listMethodRow: { flexDirection: 'row', alignItems: 'center' },
  listMethodBadge: { borderRadius: sc(8), paddingHorizontal: sc(9), paddingVertical: sc(3) },
  listMethodOffline: { backgroundColor: '#FFF3E0' },
  listMethodOnline:  { backgroundColor: '#EEF4FF' },
  listMethodText: { fontSize: sc(11), fontWeight: '700' },
  listMethodOfflineText: { color: ORANGE },
  listMethodOnlineText:  { color: BLUE },
  listFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sc(8),
    marginBottom: sc(2),
  },
  listFilterScroll: { gap: sc(6), alignItems: 'center' },
  listFilterChip: {
    width: sc(58),
    paddingVertical: sc(9),
    borderRadius: sc(20),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listFilterChipOn:      { backgroundColor: BLUE },
  listFilterChipText:    { fontSize: sc(12), fontWeight: '700', color: '#888' },
  listFilterChipTextOn:  { color: '#fff' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sc(8),
    marginBottom: sc(6),
  },
  searchFieldToggle: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  searchFieldBtn: {
    width: sc(58),
    paddingVertical: sc(9),
    borderRadius: sc(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE_L,
  },
  searchFieldBtnOn: { backgroundColor: BLUE },
  searchFieldBtnText: { fontSize: sc(12), fontWeight: '700', color: BLUE },
  searchFieldBtnTextOn: { color: '#fff' },
  searchDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#fff',
    borderRadius: sc(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: sc(4) },
    shadowOpacity: 0.12,
    shadowRadius: sc(8),
    elevation: 8,
    zIndex: 100,
    minWidth: sc(80),
    overflow: 'hidden',
  },
  searchDropdownItem: {
    paddingHorizontal: sc(16),
    paddingVertical: sc(12),
  },
  searchDropdownItemOn: { backgroundColor: BLUE_L },
  searchDropdownText: { fontSize: sc(13), fontWeight: '600', color: T1 },
  searchDropdownTextOn: { color: BLUE, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sc(6),
    backgroundColor: '#fff',
    borderRadius: sc(20),
    paddingHorizontal: sc(10),
    paddingVertical: sc(7),
    flex: 1,
  },
  searchInput: { flex: 1, fontSize: sc(12), color: T1, padding: 0 },

  // ── 유학생 슬라이드 보기 ──
  intlSlideScroll: { paddingHorizontal: sc(16), gap: sc(12), paddingBottom: sc(4) },
  intlSlideEmpty:  { paddingVertical: sc(40), paddingHorizontal: sc(16), alignItems: 'center' },
  intlSlideCard: {
    width: sc(140),
    backgroundColor: '#fff',
    borderRadius: sc(18),
    padding: sc(14),
    alignItems: 'center',
    gap: sc(6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: sc(2) },
    shadowOpacity: 0.08,
    shadowRadius: sc(8),
    elevation: 3,
  },
  intlSlideAvatar: {
    width: sc(56), height: sc(56), borderRadius: sc(28),
    alignItems: 'center', justifyContent: 'center',
    marginBottom: sc(2),
  },
  intlSlideAvatarText: { fontSize: sc(24), fontWeight: '800', color: '#fff' },
  intlSlideLvBadge: {
    borderRadius: sc(10), paddingHorizontal: sc(8), paddingVertical: sc(2),
  },
  intlSlideLvText:    { fontSize: sc(11), fontWeight: '700', color: '#fff' },
  intlSlideName:      { fontSize: sc(14), fontWeight: '800', color: T1, textAlign: 'center' },
  intlSlideMajor:     { fontSize: sc(11), color: T2, fontWeight: '500', textAlign: 'center' },
  intlSlideStatsRow:  { flexDirection: 'row', alignItems: 'center', gap: sc(3) },
  intlSlideStats:     { fontSize: sc(11), color: T2, fontWeight: '600' },
  intlSlideStatsDot:  { fontSize: sc(11), color: T2 },
  intlSlideBtn: {
    marginTop: sc(4),
    backgroundColor: BLUE,
    borderRadius: sc(12),
    paddingHorizontal: sc(14),
    paddingVertical: sc(7),
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  intlSlideBtnText: { fontSize: sc(12), fontWeight: '800', color: '#fff' },
});

