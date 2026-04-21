// 학교생활 화면
import { useState, useEffect, useRef } from 'react';
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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { s as sc } from '../../utils/scale';

const LANG_NAMES: Record<string, string> = {
  en: '영어', ja: '일본어', 'zh-Hans': '중국어(간체)',
  ru: '러시아어', mn: '몽골어', vi: '베트남어',
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

// 괄호 및 그 안의 내용 제거 (예: "Staff Cafeteria (1st floor)" → "Staff Cafeteria")
const stripParens = (name: string) => name.replace(/\s*\(.*?\)/g, '').trim();

const CATEGORY_COLOR: Record<string, string> = {
  장학: '#10B981', 학사: BLUE, 행사: '#8B5CF6', 취업: '#F59E0B', 시설: '#A8C8FA',
};

const CATEGORY_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: { 장학: 'Scholarship', 학사: 'Academic', 행사: 'Event', 취업: 'Employment', 시설: 'Facilities', '행사/취업': 'Event/Employment', 비자: 'Visa', 학생지원: 'Student Support', 정부초청: 'Gov. Invitation' },
  ja: { 장학: '奨学金', 학사: '学事', 행사: 'イベント', 취업: '就職', 시설: '施設', '행사/취업': 'イベント/就職', 비자: 'ビザ', 학생지원: '学生支援', 정부초청: '政府招聘' },
  'zh-Hans': { 장학: '奖学金', 학사: '学业', 행사: '活动', 취업: '就业', 시설: '设施', '행사/취업': '活动/就业', 비자: '签证', 학생지원: '学生支持', 정부초청: '政府邀请' },
  ru: { 장학: 'Стипендия', 학사: 'Учёба', 행사: 'Мероприятие', 취업: 'Трудоустройство', 시설: 'Объекты', '행사/취업': 'Мероп./Работа', 비자: 'Виза', 학생지원: 'Поддержка', 정부초청: 'Приглашение' },
  mn: { 장학: 'Тэтгэлэг', 학사: 'Сургалт', 행사: 'Арга хэмжээ', 취업: 'Ажил эрхлэлт', 시설: 'Байгууламж', '행사/취업': 'Арга/Ажил', 비자: 'Виз', 학생지원: 'Дэмжлэг', 정부초청: 'Урилга' },
  vi: { 장학: 'Học bổng', 학사: 'Học thuật', 행사: 'Sự kiện', 취업: 'Việc làm', 시설: 'Cơ sở', '행사/취업': 'Sự kiện/Việc làm', 비자: 'Visa', 학생지원: 'Hỗ trợ SV', 정부초청: 'Mời chính phủ' },
};

export default function SchoolScreen() {
  const user = useAuthStore((s) => s.user);
  const langCode = user?.preferredLanguage ?? 'en';
  const langName = LANG_NAMES[langCode] ?? langCode;
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<TabKey>((tab as TabKey) ?? 'CAFETERIA');

  useEffect(() => {
    if (tab === 'NOTICE' || tab === 'CAFETERIA') setActiveTab(tab);
  }, [tab]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedNotice, setExpandedNotice] = useState<number | null>(null);
  const [notices, setNotices] = useState<SchoolNotice[]>([]);
  const [noticeSearch, setNoticeSearch] = useState('');
  const [noticeSearchVisible, setNoticeSearchVisible] = useState(false);
  const noticeSearchRef = useRef<TextInput>(null);
  const [noticeCategory, setNoticeCategory] = useState('전체');
  const [noticeCategoryOpen, setNoticeCategoryOpen] = useState(false);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [meals, setMeals] = useState<MealData[]>([]);
  const [mealsLoading, setMealsLoading] = useState(false);
  const [selectedCafeteria, setSelectedCafeteria] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

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
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayMeals = data.filter((m) => m.mealDate === todayStr);
      setMeals(todayMeals);
      setSelectedDate(todayStr);
      if (todayMeals.length > 0 && !selectedCafeteria) {
        const ORDER = ['한울식당(법학관 지하1층)', '학생식당(복지관 1층)', '교직원식당(복지관 1층)'];
        const first = ORDER.find((name) => todayMeals.some((m) => m.cafeteriaKo === name));
        setSelectedCafeteria(first ?? todayMeals[0].cafeteriaKo);
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

  // 선택 날짜 기준 식당 목록 (K-Bob+ 제외)
  const CAFETERIA_ORDER = ['한울식당(법학관 지하1층)', '학생식당(복지관 1층)', '교직원식당(복지관 1층)', '청향 한식당(법학관 5층)', '청향 양식당(법학관 5층)'];
  const mealsForDate = meals.filter((m) => m.mealDate === selectedDate);
  const cafeteriaList = CAFETERIA_ORDER.filter((name) => mealsForDate.some((m) => m.cafeteriaKo === name));
  const selectedMeals = mealsForDate.filter((m) => m.cafeteriaKo === selectedCafeteria);

  return (
    <View style={s.container}>
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
              {key === 'CAFETERIA' ? '학식' : '공지사항'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 공지사항 카테고리 + 검색바 (상단 고정) ── */}
      {activeTab === 'NOTICE' && (
        <View style={s.noticeFixedHeader}>
          <View style={s.noticeTopRow}>
            <View>
              <TouchableOpacity
                style={s.categoryPickerBtn}
                onPress={() => setNoticeCategoryOpen((v) => !v)}
                activeOpacity={0.8}
              >
                <Text style={s.categoryPickerText}>{noticeCategory}</Text>
                <Ionicons name={noticeCategoryOpen ? 'chevron-up' : 'chevron-down'} size={14} color={BLUE} />
              </TouchableOpacity>
              {noticeCategoryOpen && (
                <>
                  <TouchableOpacity
                    style={s.categoryOverlay}
                    onPress={() => setNoticeCategoryOpen(false)}
                    activeOpacity={1}
                  />
                  <View style={s.categoryDropdown}>
                    {['전체', '학사', '비자', '장학', '행사/취업', '학생지원', '정부초청'].map((cat, idx, arr) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          s.categoryDropdownItem,
                          noticeCategory === cat && s.categoryDropdownItemActive,
                          idx < arr.length - 1 && s.categoryDropdownItemBorder,
                        ]}
                        onPress={() => { setNoticeCategory(cat); setNoticeCategoryOpen(false); }}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.categoryDropdownText, noticeCategory === cat && s.categoryDropdownTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
            <View style={s.noticeSearchBar}>
              <Ionicons name="search-outline" size={15} color={T2} />
              <TextInput
                ref={noticeSearchRef}
                style={s.noticeSearchInput}
                placeholder="공지사항 검색"
                placeholderTextColor={T2}
                value={noticeSearch}
                onChangeText={setNoticeSearch}
                returnKeyType="search"
              />
              {noticeSearch.length > 0 && (
                <TouchableOpacity onPress={() => setNoticeSearch('')}>
                  <Ionicons name="close-circle" size={16} color={T2} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

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
                <Text style={s.emptyTitle}>식단 정보가 없어요</Text>
                <Text style={s.emptySub}>다음에 다시 확인해보세요</Text>
              </View>
            ) : (
              <>
              <View style={s.sectionCard}>
                {/* 식당 선택 - < 이름 > 방식 */}
                {cafeteriaList.length > 0 && (() => {
                  const currentIdx = cafeteriaList.indexOf(selectedCafeteria ?? cafeteriaList[0]);
                  const translatedName = stripParens(meals.find((m) => m.cafeteriaKo === cafeteriaList[currentIdx])?.cafeteria ?? cafeteriaList[currentIdx]);
                  return (
                    <View style={s.cafeteriaTabWrap}>
                      <TouchableOpacity
                        onPress={() => setSelectedCafeteria(cafeteriaList[(currentIdx - 1 + cafeteriaList.length) % cafeteriaList.length])}
                        style={s.cafeteriaArrowBtn}
                      >
                        <Ionicons name="chevron-back" size={20} color={T1} />
                      </TouchableOpacity>
                      <Text style={s.cafeteriaTabName} numberOfLines={1}>{translatedName}</Text>
                      <TouchableOpacity
                        onPress={() => setSelectedCafeteria(cafeteriaList[(currentIdx + 1) % cafeteriaList.length])}
                        style={s.cafeteriaArrowBtn}
                      >
                        <Ionicons name="chevron-forward" size={20} color={T1} />
                      </TouchableOpacity>
                    </View>
                  );
                })()}

                {/* 3. 위치 정보 */}
                {selectedMeals.length > 0 && selectedMeals[0].cafeteria ? (
                  <Text style={s.cafeteriaLocation}>{selectedMeals[0].cafeteria}</Text>
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
              </>
            )}
          </>
        )}

        {/* ── 공지사항 콘텐츠 ── */}
        {activeTab === 'NOTICE' && (
          <View>
            {noticesLoading ? (
              <ActivityIndicator color={BLUE} style={{ marginTop: 60 }} />
            ) : notices.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>📋</Text>
                <Text style={s.emptyTitle}>공지사항이 없어요</Text>
                <Text style={s.emptySub}>나중에 다시 확인해보세요</Text>
              </View>
            ) : (
              notices
                .filter((n) => {
                  if (noticeCategory !== '전체' && n.categoryName !== noticeCategory) return false;
                  if (!noticeSearch.trim()) return true;
                  const q = noticeSearch.trim().toLowerCase();
                  return n.titleKo.toLowerCase().includes(q) || n.title.toLowerCase().includes(q);
                })
                .map((notice) => (
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
                      <View style={[s.noticeCategoryBadge, { backgroundColor: '#9CA3AF22' }]}>
                        <Text style={[s.noticeCategoryText, { color: '#9CA3AF' }]}>
                          {CATEGORY_TRANSLATIONS[langCode]?.[notice.categoryName] ?? notice.categoryName}
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

            <View style={{ height: 40 }} />
          </View>
        )}

        {activeTab === 'CAFETERIA' && <View style={{ height: 100 }} />}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── 메인 탭 바 ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: DIV,
    paddingTop: Platform.OS === 'ios' ? sc(56) : sc(32),
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: sc(13), gap: sc(6),
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: BLUE },
  tabText:       { fontSize: sc(14), fontWeight: '700', color: T2 },
  tabTextActive: { color: BLUE },

  // ── 날짜 탭 ──
  dateTabs:        { paddingHorizontal: sc(4), gap: sc(8), paddingBottom: sc(4) },
  dateTab:         { alignItems: 'center', paddingHorizontal: sc(14), paddingVertical: sc(8), borderRadius: sc(12), backgroundColor: '#F4F5F8', minWidth: sc(52) },
  dateTabActive:   { backgroundColor: BLUE },
  dateTabLabel:    { fontSize: sc(13), fontWeight: '700', color: T1 },
  dateTabLabelActive: { color: '#fff' },
  dateTabDay:      { fontSize: sc(11), color: T2, marginTop: sc(2) },
  dateTabDayActive: { color: '#BFCFFF' },

  // ── 식당 선택 탭 (| 구분선 스타일) ──
  cafeteriaTabWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sc(12),
    paddingVertical: sc(12),
    borderBottomWidth: 1,
    borderBottomColor: DIV,
  },
  cafeteriaArrowBtn: {
    padding: sc(4),
  },
  cafeteriaTabName: {
    flex: 1,
    fontSize: sc(15),
    fontWeight: '800',
    color: T1,
    textAlign: 'center',
  },
  cafeteriaLocation: {
    fontSize: sc(13),
    color: T2,
    paddingHorizontal: sc(18),
    paddingTop: sc(16),
    paddingBottom: sc(4),
  },

  // ── 스크롤 ──
  scroll:        { flex: 1 },
  scrollContent: { padding: sc(16), paddingTop: sc(6), gap: sc(12) },

  // ── Section Card ──
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: sc(16),
    borderWidth: 1,
    borderColor: '#F0F2F6',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(2) },
    shadowOpacity: 0.07, shadowRadius: sc(8), elevation: 3,
  },

  // ── 학식 카드 헤더 ──
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sc(18),
    paddingTop: sc(18),
    paddingBottom: sc(14),
    borderBottomWidth: 1,
    borderBottomColor: DIV,
  },
  mealCardTitle: { fontSize: sc(17), fontWeight: '800', color: T1 },
  mealCardDate:  { fontSize: sc(13), color: T2, fontWeight: '500' },

  // ── 코너 블록 ──
  cornerBlock: {
    paddingHorizontal: sc(18),
    paddingVertical: sc(16),
  },
  cornerBlockDivider: {
    borderBottomWidth: 1,
    borderBottomColor: DIV,
  },
  cornerName: {
    fontSize: sc(14),
    fontWeight: '800',
    color: T1,
    marginBottom: sc(8),
  },
  menuText: {
    fontSize: sc(14),
    color: '#3B4A6B',
    lineHeight: sc(22),
    fontWeight: '400',
  },

  // ── 공지사항 상단 고정 헤더 ──
  noticeFixedHeader: {
    backgroundColor: BG,
    paddingHorizontal: sc(16),
    paddingVertical: sc(10),
    borderBottomWidth: 1,
    borderBottomColor: DIV,
    zIndex: 10,
  },

  // ── 카테고리 선택 ──
  noticeTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  categoryPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: sc(6),
    backgroundColor: BLUE_L, paddingHorizontal: sc(12), paddingVertical: sc(8),
    borderRadius: sc(10),
  },
  categoryPickerText: { fontSize: sc(13), color: BLUE, fontWeight: '700' },
  categoryDropdown: {
    position: 'absolute',
    top: sc(33),
    left: 0,
    backgroundColor: '#fff',
    borderRadius: sc(6),
    borderWidth: 1,
    borderColor: '#E5EAF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: sc(6) },
    shadowOpacity: 0.1,
    shadowRadius: sc(16),
    elevation: 10,
    minWidth: sc(140),
    maxHeight: sc(240),
    zIndex: 100,
    overflow: 'hidden',
  },
  categoryOverlay: {
    position: 'absolute',
    top: -1000, left: -1000, right: -1000, bottom: -1000,
    zIndex: 99,
  },
  categoryDropdownItem: {
    paddingHorizontal: sc(16), paddingVertical: sc(11),
  },
  categoryDropdownItemActive: {
    backgroundColor: BLUE_L,
  },
  categoryDropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F6',
  },
  categoryDropdownText: { fontSize: sc(14), color: T1, fontWeight: '500' },
  categoryDropdownTextActive: { color: BLUE, fontWeight: '700' },
  searchIconBtn: { padding: sc(6) },
  noticeSearchBar: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: sc(8),
    backgroundColor: '#F4F6FB', borderRadius: sc(12),
    paddingHorizontal: sc(12), paddingVertical: sc(8),
    marginLeft: sc(8),
    marginRight: sc(4),
  },
  noticeSearchInput: { flex: 1, fontSize: sc(14), color: T1, padding: 0 },

  // ── 공지 카드 ──
  noticeCard: {
    backgroundColor: '#fff',
    borderRadius: sc(16),
    borderWidth: 1, borderColor: '#F0F2F6',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: sc(5),
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(1) },
    shadowOpacity: 0.05, shadowRadius: sc(4), elevation: 2,
  },
  noticeBar:     { width: sc(5), flexShrink: 0 },
  noticeContent: { flex: 1, paddingHorizontal: sc(14), paddingVertical: sc(12), gap: sc(6) },

  noticeHeaderRow:     { flexDirection: 'row', alignItems: 'center', gap: sc(6) },
  noticeCategoryBadge: { paddingHorizontal: sc(8), paddingVertical: sc(3), borderRadius: sc(6) },
  noticeCategoryText:  { fontSize: sc(11), fontWeight: '700' },
  noticeDate:          { fontSize: sc(11), color: T2, marginLeft: 'auto' },
  noticeTitleKo: { fontSize: sc(14), fontWeight: '700', color: T1, lineHeight: sc(20) },
  enTitleRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: sc(4) },
  noticeTitleEn: { flex: 1, fontSize: sc(13), color: BLUE, fontWeight: '500', lineHeight: sc(18) },
  linkBox: {
    flexDirection: 'row', alignItems: 'center', gap: sc(5),
    backgroundColor: BLUE_L, paddingHorizontal: sc(10), paddingVertical: sc(7),
    borderRadius: sc(8), alignSelf: 'flex-start',
  },
  linkText:   { fontSize: sc(13), color: BLUE, fontWeight: '600' },
  expandRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sc(3), paddingTop: sc(2) },
  expandText: { fontSize: sc(12), color: T2 },

  // ── Empty ──
  empty:      { alignItems: 'center', paddingVertical: sc(60), gap: sc(8) },
  emptyEmoji: { fontSize: sc(40), marginBottom: sc(4) },
  emptyTitle: { fontSize: sc(16), fontWeight: '700', color: T1 },
  emptySub:   { fontSize: sc(14), color: T2 },
});
