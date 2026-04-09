// 커뮤니티 화면 - HelloTalk 피드 스타일
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { getCommunityPosts, toggleCommunityLike, translateCommunityPost, type CommunityPostDto } from '../../services/communityService';
import { useCommunityStore } from '../../stores/communityStore';
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
  { key: 'ALL',      label: '전체' },
  { key: 'INFO',     label: '일반' },
  { key: 'QUESTION', label: '로컬' },
  { key: 'CHAT',     label: '모임' },
  { key: 'CULTURE',  label: '장터' },
];

const CATEGORY_LABEL: Record<PostCategory, string> = {
  INFO: '일반', QUESTION: '로컬', CHAT: '모임', CULTURE: '장터',
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
function FeedCard({ item, onPress, onLike, onImageScrollStart, onImageScrollEnd }: {
  item: CommunityPostDto;
  onPress: () => void;
  onLike: (postId: number, liked: boolean, likeCount: number) => void;
  onImageScrollStart?: () => void;
  onImageScrollEnd?: () => void;
}) {
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [liked, setLiked] = useState(item.liked);
  const [likeCount, setLikeCount] = useState(item.likes);
  useEffect(() => { setLiked(item.liked); setLikeCount(item.likes); }, [item.id, item.liked, item.likes]);
  const [translating, setTranslating] = useState(false);
  const { getTranslation, setTranslation } = useCommunityStore();
  const translated = getTranslation(item.id);
  const profileUri = toAbsoluteUrl(item.authorProfileImage);
  const catColor = CATEGORY_COLOR[item.category];
  const catBg    = CATEGORY_BG[item.category];
  const isHot    = item.likes >= 30;

  const validImages = item.images.filter((_, i) => !imgErrors[i]);

  return (
    <View style={s.feedCard}>
      {/* ── 유저 헤더 + 본문 (터치 가능) ── */}
      <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
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
          <View style={s.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={18} color={T2} />
          </View>
        </View>

        {/* ── 본문 ── */}
        <View style={s.feedBody}>
          <Text style={s.feedTitle} numberOfLines={2}>{translated ? translated.title : item.title}</Text>
          {(translated ? translated.content : item.content) ? (
            <Text style={s.feedContent} numberOfLines={3}>{translated ? translated.content : item.content}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* ── 이미지 (터치 독립) ── */}
      {validImages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.imageScroll}
          nestedScrollEnabled={true}
          directionalLockEnabled={true}
          decelerationRate="fast"
          onScrollBeginDrag={onImageScrollStart}
          onScrollEndDrag={onImageScrollEnd}
          onMomentumScrollEnd={onImageScrollEnd}
        >
          {validImages.map((uri, idx) => (
            <Image
              key={idx}
              source={{ uri }}
              style={s.feedImage}
              onError={() => setImgErrors(prev => ({ ...prev, [idx]: true }))}
            />
          ))}
        </ScrollView>
      )}

      {/* ── 반응 바 ── */}
      <View style={s.feedFooter}>
        <View style={s.reactionLeft}>
          <TouchableOpacity
            style={s.reactionItem}
            activeOpacity={0.7}
            onPress={async () => {
              const newLiked = !liked;
              const newCount = liked ? likeCount - 1 : likeCount + 1;
              setLiked(newLiked);
              setLikeCount(newCount);
              onLike(item.id, newLiked, newCount);
              try {
                await toggleCommunityLike(item.id);
              } catch {
                setLiked(liked);
                setLikeCount(likeCount);
                onLike(item.id, liked, likeCount);
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
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={async () => {
              if (translated) { setTranslation(item.id, null); return; }
              setTranslating(true);
              try {
                const res = await translateCommunityPost(item.id);
                if (res.success) setTranslation(item.id, res.data);
              } catch {}
              finally { setTranslating(false); }
            }}
          >
            {translating
              ? <ActivityIndicator size="small" color={T2} />
              : <Ionicons name="language-outline" size={17} color={translated ? BLUE : T2} />
            }
          </TouchableOpacity>
        </View>
        <View style={s.reactionRight} />
      </View>
    </View>
  );
}

// ── 메인 화면 ────────────────────────────────────────────────
export default function CommunityScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityPostDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [flatListScrollEnabled, setFlatListScrollEnabled] = useState(true);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('title');
  const searchInputRef = useRef<TextInput>(null);
  const HEADER_HEIGHT = 134;

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

  const handleLike = useCallback((postId: number, liked: boolean, likeCount: number) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, liked, likes: likeCount } : p));
  }, []);

  const handleImageScrollStart = useCallback(() => setFlatListScrollEnabled(false), []);
  const handleImageScrollEnd = useCallback(() => setFlatListScrollEnabled(true), []);

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

  const renderPost = useCallback(({ item }: { item: CommunityPostDto }) => (
    <FeedCard
      item={item}
      onPress={() => router.push({ pathname: '/community-post', params: { id: item.id } })}
      onLike={handleLike}
      onImageScrollStart={handleImageScrollStart}
      onImageScrollEnd={handleImageScrollEnd}
    />
  ), [router, handleLike, handleImageScrollStart, handleImageScrollEnd]);

  return (
    <View style={s.container}>
      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[s.list, { paddingTop: HEADER_HEIGHT }]}
        overScrollMode="always"
        scrollEnabled={flatListScrollEnabled}
        ItemSeparatorComponent={() => <View style={s.postDivider} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} progressViewOffset={HEADER_HEIGHT} />}
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
          <View style={s.filterScroll}>
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
          </View>
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
    paddingTop: 24,
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
    paddingTop: 6, paddingBottom: 6,
    backgroundColor: '#fff',
  },
  filterScroll: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 5,
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

  // 이미지
  imageScroll: { marginBottom: 10 },
  feedImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginRight: 8,
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
