// 커뮤니티 화면 - HelloTalk 피드 스타일
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCommunityPosts, toggleCommunityLike, type CommunityPostDto } from '../../services/communityService';
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

type FilterCategory = 'ALL' | 'HOT' | PostCategory;

const CATEGORY_FILTERS: { key: FilterCategory; label: string }[] = [
  { key: 'ALL',      label: '최신'    },
  { key: 'HOT',      label: '추천'    },
  { key: 'QUESTION', label: '질문'    },
  { key: 'CHAT',     label: '자유'    },
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
  const [liked, setLiked] = useState(item.liked);
  const [likeCount, setLikeCount] = useState(item.likes);
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
          <TouchableOpacity
            style={s.reactionItem}
            activeOpacity={0.7}
            onPress={async () => {
              setLiked((prev) => !prev);
              setLikeCount((prev) => liked ? prev - 1 : prev + 1);
              try {
                await toggleCommunityLike(item.id);
              } catch {
                setLiked((prev) => !prev);
                setLikeCount((prev) => liked ? prev + 1 : prev - 1);
              }
            }}
          >
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? '#EF4444' : T2} />
            <Text style={s.reactionCount}>{likeCount}</Text>
          </TouchableOpacity>
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

      {/* ── 댓글 미리보기 ── */}
      {item.commentList && item.commentList.length > 0 && (
        <View style={s.commentPreview}>
          {item.commentList.map((c) => (
            <View key={c.id} style={s.commentPreviewItem}>
              <Text style={s.commentPreviewAuthor}>{c.author}</Text>
              <Text style={s.commentPreviewContent} numberOfLines={1}>{c.content}</Text>
            </View>
          ))}
          {item.comments > 3 && (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
              <Text style={s.commentPreviewMore}>모든 {item.comments} 코멘트 보기</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  const HEADER_HEIGHT = 165;

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
    : selectedCategory === 'HOT'
      ? posts.filter((p) => p.likes >= 30)
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
      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[s.list, { paddingTop: HEADER_HEIGHT }]}
        bounces={false}
        overScrollMode="never"
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

      {/* 고정 헤더 */}
      <View style={s.stickyHeader}>
        <View style={s.header}>
          <View style={s.headerSearchBar}>
            <Ionicons name="search-outline" size={16} color={T2} />
            <TextInput
              ref={searchInputRef}
              style={s.headerSearchInput}
              placeholder="검색"
              placeholderTextColor={T2}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchVisible(true)}
              onBlur={() => { if (!searchQuery) setSearchVisible(false); }}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchVisible(false); }}>
                <Ionicons name="close-circle" size={16} color={T2} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={s.writeBtn}
            onPress={() => router.push('/community-write')}
            activeOpacity={0.75}
          >
            <Ionicons name="create-outline" size={26} color={T1} />
          </TouchableOpacity>
        </View>
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
        <View style={s.filterWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
            {CATEGORY_FILTERS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[s.chip, selectedCategory === key && s.chipOn]}
                onPress={() => setSelectedCategory(key)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, selectedCategory === key && s.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={s.headerDivider} />
        {isLoading ? <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 40 }} /> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  listHeader: { backgroundColor: '#fff', paddingTop: 60 },
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 10, backgroundColor: '#fff',
    paddingTop: 55,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    gap: 10,
  },
  headerSearchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: BG, borderRadius: 22,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  headerSearchInput: { flex: 1, fontSize: 15, color: T1, padding: 0 },
  writeBtn: { padding: 4 },

  // ── Search mode ──
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
    paddingTop: 10, paddingBottom: 10,
    backgroundColor: '#fff',
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
    width: '75%',
    height: 160,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#E8EDF5',
  },

  // 이미지 - 2장
  imageGrid2: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 10,
    width: '75%',
  },
  gridImage2: {
    flex: 1,
    height: 130,
    borderRadius: 8,
    backgroundColor: '#E8EDF5',
  },

  // 이미지 - 3장+
  imageGrid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginBottom: 10,
    width: '75%',
  },
  gridImage3: {
    width: '32%',
    aspectRatio: 1.2,
    borderRadius: 7,
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

  // ── 댓글 미리보기 ──
  commentPreview: {
    paddingHorizontal: 0,
    paddingBottom: 12,
    gap: 4,
  },
  commentPreviewItem: {
    flexDirection: 'row',
    gap: 6,
  },
  commentPreviewAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: T1,
  },
  commentPreviewContent: {
    fontSize: 13,
    color: T2,
    flex: 1,
  },
  commentPreviewMore: {
    fontSize: 13,
    color: T2,
    marginTop: 2,
  },

  // ── Empty ──
  empty:      { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 44, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: T1 },
  emptySub:   { fontSize: 16, color: BLUE_MID },

});
