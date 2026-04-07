// 커뮤니티 화면 - HelloTalk 피드 스타일
import { useCallback, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, RefreshControl, Image, Platform, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getCommunityPosts, type CommunityPostDto } from '../../services/communityService';
import type { PostCategory } from '../../types';

// ── Design tokens ──
const BLUE     = '#3B6FE8';
const BLUE_L   = '#EEF4FF';
const BLUE_MID = '#A8C8FA';
const BORDER   = '#E8EDF5';
const ORANGE   = '#F97316';
const T1       = '#0E1E40';
const T2       = '#6B7A99';
const T3       = '#6B9DF0';
const BG       = '#F4F6FB';

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
  INFO: BLUE_L, QUESTION: '#FFF3E8', CHAT: '#EEF4FF', CULTURE: '#F5F3FF',
};

const AVATAR_COLORS = ['#F0A040', '#F06060', BLUE, '#90C4F0', '#A0A8B0'];
const SERVER_BASE_URL = 'https://backend-production-0a6f.up.railway.app';

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function toAbsoluteUrl(path?: string): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return SERVER_BASE_URL + path;
}

function formatTime(createdAt: string): string {
  const utc = createdAt.includes('Z') || createdAt.includes('+') ? createdAt : createdAt + 'Z';
  const diff = Date.now() - new Date(utc).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

type SearchMode = 'title' | 'title+content';

// ── 피드 카드 컴포넌트 ──────────────────────────────────────
function FeedCard({ item, onPress }: { item: CommunityPostDto; onPress: () => void }) {
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const profileUri = toAbsoluteUrl(item.authorProfileImage);
  const catColor = CATEGORY_COLOR[item.category];
  const catBg    = CATEGORY_BG[item.category];
  const isHot    = item.likes >= 30;

  const validImages = item.images.filter((_, i) => !imgErrors[i]);

  return (
    <TouchableOpacity style={s.feedCard} activeOpacity={0.95} onPress={onPress}>
      {/* ── 유저 헤더 ── */}
      <View style={s.feedHeader}>
        <View style={s.feedAvatarWrap}>
          {profileUri ? (
            <Image source={{ uri: profileUri }} style={s.feedAvatar} />
          ) : (
            <View style={[s.feedAvatar, { backgroundColor: avatarColor(item.author), justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={s.feedAvatarText}>{item.author.charAt(0)}</Text>
            </View>
          )}
        </View>
        <View style={s.feedAuthorInfo}>
          <View style={s.feedNameRow}>
            <Text style={s.feedAuthorName}>{item.author}</Text>
            {isHot && (
              <View style={s.hotBadge}>
                <Text style={s.hotBadgeText}>🔥 인기</Text>
              </View>
            )}
          </View>
          <View style={s.feedMetaRow}>
            <View style={[s.catBadge, { backgroundColor: catBg }]}>
              <Text style={[s.catBadgeText, { color: catColor }]}>{CATEGORY_LABEL[item.category]}</Text>
            </View>
            <Text style={s.feedTime}>{formatTime(item.createdAt)}</Text>
            {item.university ? (
              <Text style={s.feedUniv} numberOfLines={1}>{item.university}</Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity style={s.moreBtn} activeOpacity={0.7} onPress={onPress}>
          <Ionicons name="ellipsis-horizontal" size={18} color={T2} />
        </TouchableOpacity>
      </View>

      {/* ── 본문 ── */}
      <View style={s.feedBody}>
        <Text style={s.feedTitle} numberOfLines={2}>{item.title}</Text>
        {item.content ? (
          <Text style={s.feedContent} numberOfLines={3}>{item.content}</Text>
        ) : null}
      </View>

      {/* ── 이미지 그리드 ── */}
      {validImages.length === 1 && (
        <Image
          source={{ uri: validImages[0] }}
          style={s.singleImage}
          onError={() => setImgErrors(prev => ({ ...prev, 0: true }))}
        />
      )}
      {validImages.length === 2 && (
        <View style={s.imageGrid2}>
          {validImages.map((uri, idx) => (
            <Image
              key={idx}
              source={{ uri }}
              style={s.gridImage2}
              onError={() => setImgErrors(prev => ({ ...prev, [idx]: true }))}
            />
          ))}
        </View>
      )}
      {validImages.length >= 3 && (
        <View style={s.imageGrid3}>
          {validImages.slice(0, 6).map((uri, idx) => (
            <Image
              key={idx}
              source={{ uri }}
              style={s.gridImage3}
              onError={() => setImgErrors(prev => ({ ...prev, [idx]: true }))}
            />
          ))}
        </View>
      )}

      {/* ── 반응 바 ── */}
      <View style={s.feedFooter}>
        <View style={s.reactionLeft}>
          <View style={s.reactionItem}>
            <Ionicons name="heart-outline" size={16} color={T2} />
            <Text style={s.reactionCount}>{item.likes}</Text>
          </View>
          <View style={s.reactionItem}>
            <Ionicons name="chatbubble-outline" size={15} color={T2} />
            <Text style={s.reactionCount}>{item.comments}</Text>
          </View>
        </View>
        <View style={s.reactionRight}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={16} color={T2} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── 메인 화면 ────────────────────────────────────────────────
export default function CommunityScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityPostDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('title');
  const searchInputRef = useRef<TextInput>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await getCommunityPosts();
      if (res.success) setPosts(res.data.content);
    } catch (e) {
      console.log('[Community] fetchPosts error:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchPosts(); }, [fetchPosts]));

  const onRefresh = () => { setRefreshing(true); fetchPosts(); };

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
    : posts.filter((p) => p.category === (selectedCategory as PostCategory));

  const filteredPosts = searchQuery.trim()
    ? categoryFiltered.filter((p) => {
        const q = searchQuery.trim().toLowerCase();
        if (searchMode === 'title') return p.title.toLowerCase().includes(q);
        return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
      })
    : categoryFiltered;

  const renderPost = useCallback(({ item }: { item: CommunityPostDto }) => (
    <FeedCard
      item={item}
      onPress={() => router.push({ pathname: '/community-post', params: { id: item.id } })}
    />
  ), [router]);

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

      {/* 구분선 */}
      <View style={s.headerDivider} />

      {/* 게시글 목록 */}
      {isLoading ? (
        <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />
      ) : null}
      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={s.postDivider} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>{searchQuery ? '🔍' : '💬'}</Text>
              <Text style={s.emptyTitle}>{searchQuery ? '검색 결과가 없습니다' : '게시글이 없습니다'}</Text>
              <Text style={s.emptySub}>{searchQuery ? '다른 검색어로 시도해보세요' : '첫 번째 글을 작성해보세요!'}</Text>
            </View>
          ) : null
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
  container: { flex: 1, backgroundColor: BG },

  // ── 상단 여백 ──
  topSpacer: { height: Platform.OS === 'ios' ? 60 : 32 },

  // ── Search ──
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    backgroundColor: '#fff',
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F4F6FB', borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14, color: T1, padding: 0 },
  searchCancel: { paddingHorizontal: 4 },
  searchCancelText: { fontSize: 14, color: BLUE, fontWeight: '700' },
  searchModeRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 16, paddingBottom: 8,
    backgroundColor: '#fff',
  },
  modeChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 16, backgroundColor: '#F4F6FB',
    borderWidth: 1, borderColor: BORDER,
  },
  modeChipOn: { backgroundColor: BLUE, borderColor: BLUE },
  modeChipText: { fontSize: 13, fontWeight: '700', color: BLUE_MID },
  modeChipTextOn: { color: '#fff' },

  // ── Filter ──
  filterWrap: {
    paddingTop: 12, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
  },
  searchIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16, flexShrink: 0,
  },
  filterScroll: { paddingHorizontal: 16, gap: 6 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F4F6FB',
    borderWidth: 1, borderColor: BORDER, flexShrink: 0,
  },
  chipOn:     { backgroundColor: BLUE, borderColor: BLUE },
  chipText:   { fontSize: 14, fontWeight: '600', color: T2 },
  chipTextOn: { color: '#fff', fontWeight: '700' },

  headerDivider: { height: 1, backgroundColor: BORDER },

  // ── List ──
  list: { paddingBottom: 100 },
  postDivider: { height: 8, backgroundColor: BG },

  // ── Feed Card ──
  feedCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },

  // 유저 헤더
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  feedAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    flexShrink: 0,
  },
  feedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  feedAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  feedAuthorInfo: { flex: 1, gap: 4 },
  feedNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  feedAuthorName: { fontSize: 15, fontWeight: '700', color: T1 },
  feedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  feedTime: { fontSize: 12, color: T2 },
  feedUniv: { fontSize: 12, color: T2, flex: 1 },
  moreBtn: { padding: 4 },

  // 카테고리 배지
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontWeight: '700' },

  // 인기 배지
  hotBadge: {
    backgroundColor: '#FFF3E8',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  hotBadgeText: { fontSize: 11, fontWeight: '700', color: ORANGE },

  // 본문
  feedBody: { marginBottom: 10 },
  feedTitle: { fontSize: 15, fontWeight: '700', color: T1, lineHeight: 22, marginBottom: 4 },
  feedContent: { fontSize: 14, color: T2, lineHeight: 20 },

  // 이미지 - 1장
  singleImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#E8EDF5',
  },

  // 이미지 - 2장
  imageGrid2: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 10,
  },
  gridImage2: {
    flex: 1,
    height: 180,
    borderRadius: 10,
    backgroundColor: '#E8EDF5',
  },

  // 이미지 - 3장+
  imageGrid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginBottom: 10,
  },
  gridImage3: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#E8EDF5',
  },

  // 반응 바
  feedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F3F8',
    marginTop: 6,
  },
  reactionLeft: { flexDirection: 'row', gap: 16 },
  reactionRight: { flexDirection: 'row', gap: 12 },
  reactionItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reactionCount: { fontSize: 13, color: T2, fontWeight: '600' },
  iconBtn: { padding: 4 },

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
