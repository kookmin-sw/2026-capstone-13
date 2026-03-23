// 커뮤니티 화면
import { useCallback, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, RefreshControl, Image, Platform, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCommunityStore } from '../../stores/communityStore';
import type { CommunityPost, PostCategory } from '../../types';

// ── Design tokens (홈 화면과 동일) ──
const BLUE     = '#3B6FE8';
const BLUE_L   = '#EEF4FF';
const BLUE_MID = '#A8C8FA';
const BORDER   = '#D4E4FA';
const ORANGE   = '#F97316';
const T1       = '#0E1E40';
const T3       = '#6B9DF0';

type FilterCategory = 'ALL' | PostCategory;

const CATEGORY_FILTERS: { key: FilterCategory; label: string }[] = [
  { key: 'ALL',      label: '전체'    },
  { key: 'INFO',     label: '정보공유' },
  { key: 'QUESTION', label: '질문'    },
  { key: 'CHAT',     label: '잡담'    },
  { key: 'CULTURE',  label: '문화교류' },
];

const CATEGORY_LABEL: Record<PostCategory, string> = {
  INFO: '정보공유', QUESTION: '질문', CHAT: '잡담', CULTURE: '문화교류',
};

const CATEGORY_COLOR: Record<PostCategory, string> = {
  INFO: BLUE, QUESTION: ORANGE, CHAT: T3, CULTURE: '#8B5CF6',
};

const CATEGORY_BG: Record<PostCategory, string> = {
  INFO: BLUE_L, QUESTION: '#FFF3E8', CHAT: BLUE_L, CULTURE: '#F5F3FF',
};

const AVATAR_COLORS = ['#F0A040', '#F06060', BLUE, '#90C4F0', '#A0A8B0'];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function formatTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

type SearchMode = 'title' | 'title+content';

export default function CommunityScreen() {
  const router = useRouter();
  const { posts } = useCommunityStore();
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('title');
  const searchInputRef = useRef<TextInput>(null);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const openSearch = () => {
    setSearchVisible(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const closeSearch = () => {
    setSearchVisible(false);
    setSearchQuery('');
  };

  const categoryFiltered = selectedCategory === 'ALL'
    ? posts
    : posts.filter((p) => p.category === selectedCategory);

  const filteredPosts = searchQuery.trim()
    ? categoryFiltered.filter((p) => {
        const q = searchQuery.trim().toLowerCase();
        if (searchMode === 'title') return p.title.toLowerCase().includes(q);
        return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
      })
    : categoryFiltered;

  const isHot = (item: CommunityPost) => item.likes >= 30;

  const renderPost = useCallback(({ item }: { item: CommunityPost }) => {
    const catColor = CATEGORY_COLOR[item.category];
    const catBg    = CATEGORY_BG[item.category];
    const hot = isHot(item);
    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/community-post', params: { id: item.id } })}
      >
        {/* 홈 카드와 동일한 왼쪽 컬러 바 */}
        <View style={[s.cardBar, { backgroundColor: catColor }]} />
        <View style={s.cardContent}>
          {/* 상단 메타 */}
          <View style={s.cardMeta}>
            <View style={[s.catBadge, { backgroundColor: catBg }]}>
              <Text style={[s.catBadgeText, { color: catColor }]}>
                {CATEGORY_LABEL[item.category]}
              </Text>
            </View>
            {item.userType === 'INTERNATIONAL' && (
              <View style={s.intlBadge}>
                <Text style={s.intlBadgeText}>유학생</Text>
              </View>
            )}
            <View style={s.dotSep} />
            <Text style={s.metaTime}>{formatTime(item.createdAt)}</Text>
            {hot && (
              <View style={s.hotBadge}>
                <View style={s.hotDot} />
                <Text style={s.hotBadgeText}>인기</Text>
              </View>
            )}
          </View>

          {/* 제목 */}
          <Text style={s.title} numberOfLines={2}>{item.title}</Text>

          {/* 내용 미리보기 */}
          <Text style={s.content} numberOfLines={2}>{item.content}</Text>

          {/* 이미지 미리보기 */}
          {item.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.imageScroll}>
              {item.images.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={s.imageThumbnail} />
              ))}
            </ScrollView>
          )}

          {/* 푸터 */}
          <View style={s.footer}>
            <View style={s.authorRow}>
              <View style={[s.avatar, { backgroundColor: avatarColor(item.author) }]}>
                <Text style={s.avatarText}>{item.author.charAt(0)}</Text>
              </View>
              <Text style={s.authorName}>{item.author}</Text>
            </View>
            <View style={s.reactions}>
              <View style={s.reactionItem}>
                <Ionicons name="heart-outline" size={13} color={BLUE_MID} />
                <Text style={s.reactionCount}>{item.likes}</Text>
              </View>
              <View style={s.reactionItem}>
                <Ionicons name="chatbubble-outline" size={13} color={BLUE_MID} />
                <Text style={s.reactionCount}>{item.comments}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <View style={s.container}>
      {/* 상단 여백 */}
      <View style={s.topSpacer} />

      {/* 검색 바 */}
      {searchVisible && (
        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={14} color={BLUE_MID} />
            <TextInput
              ref={searchInputRef}
              style={s.searchInput}
              placeholder="검색어를 입력하세요"
              placeholderTextColor={BLUE_MID}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={14} color={BLUE_MID} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={s.searchCancel} onPress={closeSearch}>
            <Text style={s.searchCancelText}>취소</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 검색 모드 선택 */}
      {searchVisible && (
        <View style={s.searchModeRow}>
          <TouchableOpacity
            style={[s.modeChip, searchMode === 'title' && s.modeChipOn]}
            onPress={() => setSearchMode('title')}
          >
            <Text style={[s.modeChipText, searchMode === 'title' && s.modeChipTextOn]}>제목</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.modeChip, searchMode === 'title+content' && s.modeChipOn]}
            onPress={() => setSearchMode('title+content')}
          >
            <Text style={[s.modeChipText, searchMode === 'title+content' && s.modeChipTextOn]}>제목 + 내용</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 카테고리 필터 + 검색 버튼 */}
      <View style={s.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {CATEGORY_FILTERS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[s.chip, selectedCategory === key && s.chipOn]}
              onPress={() => setSelectedCategory(key)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, selectedCategory === key && s.chipTextOn]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={s.searchIconBtn} onPress={openSearch}>
          <Ionicons name="search-outline" size={15} color={T3} />
        </TouchableOpacity>
      </View>

      {/* 게시글 목록 */}
      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>{searchQuery ? '🔍' : '💬'}</Text>
            <Text style={s.emptyTitle}>{searchQuery ? '검색 결과가 없습니다' : '게시글이 없습니다'}</Text>
            <Text style={s.emptySub}>{searchQuery ? '다른 검색어로 시도해보세요' : '첫 번째 글을 작성해보세요!'}</Text>
          </View>
        }
      />

      {/* FAB */}
      <View style={s.fabWrap}>
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push('/community-write')}
          activeOpacity={0.88}
        >
          <Ionicons name="add" size={13} color="#fff" />
          <Text style={s.fabText}>글쓰기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // ── NAV (홈과 동일) ──
  nav: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 72 : 40,
    paddingBottom: 0,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navTitle: { fontSize: 22, fontWeight: '900', color: T1, letterSpacing: -0.5 },
  navIcons: { flexDirection: 'row', gap: 8 },
  notifBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Search ──
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14, color: T1, padding: 0 },
  searchCancel: { paddingHorizontal: 4 },
  searchCancelText: { fontSize: 14, color: BLUE, fontWeight: '700' },
  searchModeRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 16, paddingBottom: 6,
  },
  modeChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 16, backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
  },
  modeChipOn: { backgroundColor: BLUE, borderColor: BLUE },
  modeChipText: { fontSize: 13, fontWeight: '700', color: BLUE_MID },
  modeChipTextOn: { color: '#fff' },

  // ── Filter (홈 칩과 동일) ──
  topSpacer: { height: Platform.OS === 'ios' ? 60 : 32 },
  filterWrap: { paddingTop: 14, flexDirection: 'row', alignItems: 'center' },
  searchIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16, flexShrink: 0,
  },
  filterScroll: { paddingHorizontal: 16, gap: 6 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 22, backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER, flexShrink: 0,
  },
  chipOn:     { backgroundColor: BLUE, borderColor: BLUE },
  chipText:   { fontSize: 14, fontWeight: '700', color: BLUE_MID },
  chipTextOn: { color: '#fff' },

  // ── List ──
  list: { padding: 16, paddingBottom: 100 },

  // ── Card (홈 카드 스타일 통일) ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    flexDirection: 'row',
  },
  cardBar:     { width: 5, flexShrink: 0 },
  cardContent: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },

  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  catBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  catBadgeText: { fontSize: 13, fontWeight: '800' },
  intlBadge: {
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7,
    backgroundColor: '#FFF0E6',
  },
  intlBadgeText: { fontSize: 13, fontWeight: '800', color: '#C45A10' },
  dotSep: { width: 4, height: 4, borderRadius: 2, backgroundColor: BORDER },
  metaTime: { fontSize: 13, color: BLUE_MID, fontWeight: '500' },
  hotBadge: {
    marginLeft: 'auto',
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF3E6', borderRadius: 7,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  hotDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: ORANGE },
  hotBadgeText:{ fontSize: 13, fontWeight: '800', color: '#C45A10' },

  title:   { fontSize: 17, fontWeight: '700', color: T1, lineHeight: 24, marginBottom: 6, letterSpacing: -0.3 },
  content: { fontSize: 14, color: T3, lineHeight: 20, marginBottom: 10 },

  imageScroll:    { marginBottom: 10 },
  imageThumbnail: { width: 72, height: 72, borderRadius: 10, marginRight: 8 },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  authorRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText:   { fontSize: 11, color: '#fff', fontWeight: '700' },
  authorName:   { fontSize: 14, color: BLUE_MID, fontWeight: '500' },
  reactions:    { flexDirection: 'row', gap: 10 },
  reactionItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reactionCount:{ fontSize: 13, color: BLUE_MID, fontWeight: '600' },

  // ── Empty (홈과 동일) ──
  empty:      { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 44, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: T1 },
  emptySub:   { fontSize: 16, color: BLUE_MID },

  // ── FAB (홈과 동일, 중앙 정렬) ──
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
