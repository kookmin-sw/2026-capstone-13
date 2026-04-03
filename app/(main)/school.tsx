// 학교생활 화면
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const LANG_NAMES: Record<string, string> = {
  en: '영어', 'zh-Hans': '중국어(간체)', 'zh-Hant': '중국어(번체)',
  ja: '일본어', vi: '베트남어', mn: '몽골어',
  fr: '프랑스어', de: '독일어', es: '스페인어', ru: '러시아어',
};

// ── Design tokens (홈 화면과 동일) ──
const BLUE   = '#3B6FE8';
const BLUE_L = '#EEF4FF';
const T1     = '#0C1C3C';
const T2     = '#AABBCC';
const BG     = '#FFFFFF';
const DIV    = '#F4F5F8';

type TabKey = 'CAFETERIA' | 'NOTICE';

interface MealData {
  id: number;
  mealDate: string;
  cafeteria: string;
  corner: string;
  cafeteriaKo: string;
  cornerKo: string;
  menu: string;
}

interface SchoolNotice {
  id: number;
  categoryId: string;
  categoryName: string;
  titleKo: string;
  title: string;
  link: string;
  pubDate: string | null;
}

const CATEGORY_COLOR: Record<string, string> = {
  장학: '#10B981', 학사: BLUE, 행사: '#8B5CF6', 취업: '#F59E0B', 시설: '#A8C8FA',
};

export default function SchoolScreen() {
  const user = useAuthStore((s) => s.user);
  const langCode = user?.preferredLanguage ?? 'en';
  const langName = LANG_NAMES[langCode] ?? langCode;

  const [activeTab, setActiveTab] = useState<TabKey>('CAFETERIA');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedNotice, setExpandedNotice] = useState<number | null>(null);
  const [notices, setNotices] = useState<SchoolNotice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [meals, setMeals] = useState<MealData[]>([]);
  const [mealsLoading, setMealsLoading] = useState(false);
  const [selectedCafeteria, setSelectedCafeteria] = useState<string | null>(null);

  const fetchNotices = async () => {
    setNoticesLoading(true);
    try {
      const res = await api.get('/notices');
      const noticeData = res.data.data?.content ?? res.data.data ?? [];
      setNotices(Array.isArray(noticeData) ? noticeData : []);
    } catch (e) {
      // 실패 시 빈 목록 유지
    } finally {
      setNoticesLoading(false);
    }
  };

  const fetchMeals = async () => {
    setMealsLoading(true);
    try {
      const res = await api.get('/meals');
      const data: MealData[] = res.data.data ?? [];
      setMeals(data);
      if (data.length > 0 && !selectedCafeteria) {
        const ORDER = ['한울식당(법학관 지하1층)', '학생식당(복지관 1층)', '교직원식당(복지관 1층)'];
        const first = ORDER.find((name) => data.some((m) => m.cafeteriaKo === name));
        setSelectedCafeteria(first ?? data[0].cafeteriaKo);
      }
    } catch (e) {
      // 실패 시 빈 목록 유지
    } finally {
      setMealsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
    fetchMeals();
  }, [langCode]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchNotices(), fetchMeals()]).finally(() => setRefreshing(false));
  };

  // 식당 목록 (cafeteriaKo 기준, 표시는 번역된 cafeteria 사용)
  const CAFETERIA_ORDER = ['한울식당(법학관 지하1층)', '학생식당(복지관 1층)', '교직원식당(복지관 1층)', 'K-Bob+', '청향 한식당(법학관 5층)', '청향 양식당(법학관 5층)', '생활관식당 일반식(생활관 A동 1층)'];
  const cafeteriaList = CAFETERIA_ORDER.filter((name) => meals.some((m) => m.cafeteriaKo === name));

  // 선택된 식당의 코너 목록
  const selectedMeals = meals.filter((m) => m.cafeteriaKo === selectedCafeteria);

  const mealDate = meals.length > 0 ? meals[0].mealDate : '';

  return (
    <View style={s.container}>
      {/* ── NAV (고정) ── */}
      <View style={s.nav}>
        <View>
          <Text style={s.navTitle}>학교생활</Text>
          <Text style={s.navSub}>국민대학교</Text>
        </View>
        <View style={s.navRight}>
          <View style={s.onlineDot} />
          <Text style={s.onlineText}>실시간</Text>
        </View>
      </View>

      {/* ── 메인 탭 바 (오늘의 학식 / 공지사항) ── */}
      <View style={s.tabBar}>
        {(['CAFETERIA', 'NOTICE'] as TabKey[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[s.tab, activeTab === key && s.tabActive]}
            onPress={() => setActiveTab(key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={key === 'CAFETERIA' ? 'restaurant-outline' : 'megaphone-outline'}
              size={16}
              color={activeTab === key ? BLUE : T2}
            />
            <Text style={[s.tabText, activeTab === key && s.tabTextActive]}>
              {key === 'CAFETERIA' ? '오늘의 학식' : '공지사항'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        contentContainerStyle={s.scrollContent}
      >
        {/* ── 학식 콘텐츠 ── */}
        {activeTab === 'CAFETERIA' && (
          <>
            {mealsLoading ? (
              <ActivityIndicator color={BLUE} style={{ marginTop: 60 }} />
            ) : meals.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>🍽️</Text>
                <Text style={s.emptyTitle}>오늘의 식단이 없어요</Text>
                <Text style={s.emptySub}>다음에 다시 확인해보세요</Text>
              </View>
            ) : (
              <View style={s.sectionCard}>
                {/* 1. 날짜 헤더 */}
                <View style={s.mealCardHeader}>
                  <Text style={s.mealCardTitle}>오늘의 식단</Text>
                  {mealDate ? (
                    <Text style={s.mealCardDate}>{mealDate}</Text>
                  ) : null}
                </View>

                {/* 2. 식당 선택 탭 (| 구분선 스타일) */}
                <View style={s.cafeteriaTabWrap}>
                  {cafeteriaList.map((name, idx) => {
                    const translatedName = meals.find((m) => m.cafeteriaKo === name)?.cafeteria ?? name;
                    return (
                      <View key={name} style={s.cafeteriaTabItem}>
                        {idx > 0 && <Text style={s.cafeteriaTabDivider}>|</Text>}
                        <TouchableOpacity
                          onPress={() => setSelectedCafeteria(name)}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.cafeteriaTabText, selectedCafeteria === name && s.cafeteriaTabTextActive]}>
                            {translatedName}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                {/* 3. 위치 정보 */}
                {selectedMeals.length > 0 && selectedMeals[0].cafeteriaKo ? (
                  <Text style={s.cafeteriaLocation}>{selectedMeals[0].cafeteriaKo}</Text>
                ) : null}

                {/* 4. 코너별 메뉴 */}
                {selectedMeals.map((meal, idx) => (
                  <View
                    key={meal.id}
                    style={[s.cornerBlock, idx < selectedMeals.length - 1 && s.cornerBlockDivider]}
                  >
                    <Text style={s.cornerName}>{meal.corner}</Text>
                    <Text style={s.menuText}>
                      {meal.menu.split('\n').filter(Boolean).join('\n')}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── 공지사항 콘텐츠 ── */}
        {activeTab === 'NOTICE' && (
          <>
            {/* 번역 안내 배지 */}
            <View style={s.translateBadge}>
              <Ionicons name="language-outline" size={13} color={BLUE} />
              <Text style={s.translateBadgeText}>공지사항 제목을 {langName}로 번역했어요</Text>
            </View>

            {noticesLoading ? (
              <ActivityIndicator color={BLUE} style={{ marginTop: 60 }} />
            ) : notices.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>📋</Text>
                <Text style={s.emptyTitle}>공지사항이 없어요</Text>
                <Text style={s.emptySub}>나중에 다시 확인해보세요</Text>
              </View>
            ) : (
              notices.map((notice) => (
                <TouchableOpacity
                  key={notice.id}
                  style={s.noticeCard}
                  onPress={() => setExpandedNotice(expandedNotice === notice.id ? null : notice.id)}
                  activeOpacity={0.85}
                >
                  {/* 왼쪽 컬러 바 */}
                  <View style={[s.noticeBar, { backgroundColor: CATEGORY_COLOR[notice.categoryName] ?? '#9CA3AF' }]} />

                  <View style={s.noticeContent}>
                    <View style={s.noticeHeaderRow}>
                      <View style={[
                        s.noticeCategoryBadge,
                        { backgroundColor: (CATEGORY_COLOR[notice.categoryName] ?? '#9CA3AF') + '22' },
                      ]}>
                        <Text style={[
                          s.noticeCategoryText,
                          { color: CATEGORY_COLOR[notice.categoryName] ?? '#9CA3AF' },
                        ]}>
                          {notice.categoryName}
                        </Text>
                      </View>
                      <Text style={s.noticeDate}>{notice.pubDate ?? ''}</Text>
                    </View>

                    <Text style={s.noticeTitleKo} numberOfLines={expandedNotice === notice.id ? undefined : 2}>
                      {notice.titleKo}
                    </Text>

                    <View style={s.enTitleRow}>
                      <Ionicons name="language-outline" size={12} color={BLUE} />
                      <Text style={s.noticeTitleEn} numberOfLines={expandedNotice === notice.id ? undefined : 1}>
                        {notice.title}
                      </Text>
                    </View>

                    {expandedNotice === notice.id && notice.link ? (
                      <TouchableOpacity
                        style={s.linkBox}
                        onPress={() => Linking.openURL(notice.link)}
                      >
                        <Ionicons name="open-outline" size={13} color={BLUE} />
                        <Text style={s.linkText}>원문 보기</Text>
                      </TouchableOpacity>
                    ) : null}

                    <View style={s.expandRow}>
                      <Ionicons
                        name={expandedNotice === notice.id ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={T2}
                      />
                      <Text style={s.expandText}>
                        {expandedNotice === notice.id ? '접기' : '자세히 보기'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

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
  navTitle:   { fontSize: 20, fontWeight: '900', color: T1, letterSpacing: -0.5 },
  navSub:     { fontSize: 12, color: T2, fontWeight: '500', marginTop: 1 },
  navRight:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  onlineText: { fontSize: 12, color: '#22C55E', fontWeight: '600' },

  // ── 메인 탭 바 ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: DIV,
    paddingTop: Platform.OS === 'ios' ? 100 : 72,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, gap: 6,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: BLUE },
  tabText:       { fontSize: 14, fontWeight: '700', color: T2 },
  tabTextActive: { color: BLUE },

  // ── 식당 선택 탭 (| 구분선 스타일) ──
  cafeteriaTabWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DIV,
  },
  cafeteriaTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cafeteriaTabDivider: {
    fontSize: 14,
    color: T2,
    marginHorizontal: 10,
  },
  cafeteriaTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: T2,
  },
  cafeteriaTabTextActive: {
    color: T1,
    fontWeight: '800',
  },
  cafeteriaLocation: {
    fontSize: 13,
    color: T2,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 4,
  },

  // ── 스크롤 ──
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // ── Section Card ──
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F2F6',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },

  // ── 학식 카드 헤더 ──
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: DIV,
  },
  mealCardTitle: { fontSize: 17, fontWeight: '800', color: T1 },
  mealCardDate:  { fontSize: 13, color: T2, fontWeight: '500' },

  // ── 코너 블록 ──
  cornerBlock: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  cornerBlockDivider: {
    borderBottomWidth: 1,
    borderBottomColor: DIV,
  },
  cornerName: {
    fontSize: 14,
    fontWeight: '800',
    color: T1,
    marginBottom: 8,
  },
  menuText: {
    fontSize: 14,
    color: '#3B4A6B',
    lineHeight: 22,
    fontWeight: '400',
  },

  // ── 번역 배지 ──
  translateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: BLUE_L, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10, alignSelf: 'flex-start',
  },
  translateBadgeText: { fontSize: 12, color: BLUE, fontWeight: '600' },

  // ── 공지 카드 ──
  noticeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1, borderColor: '#F0F2F6',
    flexDirection: 'row',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  noticeBar:     { width: 5, borderRadius: 16, flexShrink: 0 },
  noticeContent: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 6 },

  noticeHeaderRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noticeCategoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  noticeCategoryText:  { fontSize: 11, fontWeight: '700' },
  noticeDate:          { fontSize: 11, color: T2, marginLeft: 'auto' },
  noticeTitleKo: { fontSize: 14, fontWeight: '700', color: T1, lineHeight: 20 },
  enTitleRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  noticeTitleEn: { flex: 1, fontSize: 13, color: BLUE, fontWeight: '500', lineHeight: 18 },
  linkBox: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: BLUE_L, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  linkText:   { fontSize: 13, color: BLUE, fontWeight: '600' },
  expandRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 2 },
  expandText: { fontSize: 12, color: T2 },

  // ── Empty ──
  empty:      { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T1 },
  emptySub:   { fontSize: 14, color: T2 },
});
