// 커뮤니티 화면 - 카테고리 홈 + 피드
import { Ionicons } from '@expo/vector-icons';
import { s as sc } from '../../utils/scale';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getInitial } from '../../utils/getInitial';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { blockUser } from '../../services/blockService';
import { getCommunityPosts, deleteCommunityPost, toggleCommunityLike, translateCommunityPost, type CommunityPostDto } from '../../services/communityService';
import { getOrCreateDirectRoom } from '../../services/directChatService';
import { useCommunityStore } from '../../stores/communityStore';
import { useAuthStore } from '../../stores/authStore';
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

const CATEGORY_LABEL: Record<PostCategory, string> = {
  INFO: '일반', QUESTION: '로컬', CHAT: '모임', CULTURE: '장터',
};

const CATEGORY_COLOR: Record<PostCategory, string> = {
  INFO: BLUE, QUESTION: ORANGE, CHAT: T3, CULTURE: '#8B5CF6',
};

const CATEGORY_BG: Record<PostCategory, string> = {
  INFO: BLUE_L, QUESTION: '#FFF3E8', CHAT: '#EEF4FF', CULTURE: '#F5F3FF',
};

// 카테고리 홈 메뉴 정의
const CATEGORY_MENU: {
  key: PostCategory | 'ALL';
  label: string;
  desc: string;
  icon: string;
  color: string;
  bg: string;
}[] = [
  { key: 'ALL',      label: '전체', desc: '모든 글 모아보기',           icon: 'apps-outline',         color: T1,       bg: BG },
  { key: 'INFO',     label: '일반',        desc: '자유롭게 이야기해요',         icon: 'chatbubbles-outline',  color: BLUE,     bg: BLUE_L },
  { key: 'QUESTION', label: '로컬',        desc: '우리 지역 이야기',            icon: 'location-outline',     color: ORANGE,   bg: '#FFF3E8' },
  { key: 'CHAT',     label: '모임',        desc: '같이 만나요',                icon: 'people-outline',       color: T3,       bg: '#EEF4FF' },
  { key: 'CULTURE',  label: '장터',        desc: '사고 팔고 나눠요',            icon: 'storefront-outline',   color: '#8B5CF6', bg: '#F5F3FF' },
];

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

// ── 카테고리 홈 화면 ──────────────────────────────────────────
function CategoryHomeScreen({ onSelect }: { onSelect: (cat: FilterCategory) => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[cs.container, { paddingTop: insets.top + 10 }]}>
      {/* 헤더 */}
      <View style={cs.header}>
        <Text style={cs.headerTitle}>커뮤니티</Text>
        <TouchableOpacity style={cs.writeBtn} onPress={() => router.push('/community-write')} activeOpacity={0.75}>
          <Ionicons name="create-outline" size={24} color={T1} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={cs.scroll}>
        {/* 카테고리 목록 */}
        <View style={cs.section}>
          {CATEGORY_MENU.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[cs.menuItem, idx < CATEGORY_MENU.length - 1 && cs.menuItemBorder]}
              onPress={() => onSelect(item.key as FilterCategory)}
              activeOpacity={0.7}
            >
              <View style={[cs.iconWrap, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as never} size={22} color={item.color} />
              </View>
              <View style={cs.menuText}>
                <Text style={cs.menuLabel}>{item.label}</Text>
                <Text style={cs.menuDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={T2} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── 피드 카드 컴포넌트 ──────────────────────────────────────
function FeedCard({ item, onPress, onLike, onDelete, onBlockSuccess, onImageScrollStart, onImageScrollEnd }: {
  item: CommunityPostDto;
  onPress: () => void;
  onLike: (postId: number, liked: boolean, likeCount: number) => void;
  onDelete: (postId: number) => void;
  onBlockSuccess?: () => void;
  onImageScrollStart?: () => void;
  onImageScrollEnd?: () => void;
}) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [liked, setLiked] = useState(item.liked);
  const [likeCount, setLikeCount] = useState(item.likes);
  useEffect(() => { setLiked(item.liked); setLikeCount(item.likes); }, [item.id, item.liked, item.likes]);
  const [translating, setTranslating] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const moreRef = useRef<TouchableOpacity>(null);
  const { getTranslation, setTranslation } = useCommunityStore();
  const translated = getTranslation(item.id);
  const isMyPost = item.authorId !== undefined && item.authorId === user?.id;
  const isDeletedUser = item.author === '(알 수 없음)';
  const profileUri = toAbsoluteUrl(item.authorProfileImage);
  const catColor = CATEGORY_COLOR[item.category];
  const catBg    = CATEGORY_BG[item.category];
  const isHot    = item.likes >= 30;

  const validImages = item.images.filter((_, i) => !imgErrors[i]);

  return (
    <View style={s.feedCard}>
      <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
        <View style={s.feedHeader}>
          <TouchableOpacity
            style={s.feedAvatarWrap}
            activeOpacity={isMyPost ? 1 : 0.8}
            onPress={() => !isMyPost && item.authorId && item.author !== '(알 수 없음)' && router.push({ pathname: '/user-profile', params: { id: item.authorId } })}
          >
            {profileUri ? (
              <Image source={{ uri: profileUri }} style={s.feedAvatar} />
            ) : (
              <View style={[s.feedAvatar, { backgroundColor: avatarColor(item.author), justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={s.feedAvatarText}>{getInitial(item.author)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={s.feedAuthorInfo}>
            <View style={s.feedNameRow}>
              <TouchableOpacity
                activeOpacity={isMyPost ? 1 : 0.8}
                onPress={() => !isMyPost && item.authorId && item.author !== '(알 수 없음)' && router.push({ pathname: '/user-profile', params: { id: item.authorId } })}
              >
                <Text style={s.feedAuthorName}>{item.author}</Text>
              </TouchableOpacity>
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
          {!isDeletedUser && (
            <TouchableOpacity
              ref={moreRef}
              style={s.moreBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              onPress={() => {
                moreRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
                  setMenuPos({
                    top: pageY + height + 4,
                    right: Dimensions.get('window').width - pageX - width,
                  });
                  setMenuVisible(true);
                });
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={T2} />
            </TouchableOpacity>
          )}
        </View>

        <View style={s.feedBody}>
          <Text style={s.feedTitle} numberOfLines={2}>{translated ? translated.title : item.title}</Text>
          {(translated ? translated.content : item.content) ? (
            <Text style={s.feedContent} numberOfLines={3}>{translated ? translated.content : item.content}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {validImages.length > 0 && (
        <TouchableOpacity activeOpacity={1} onPress={onPress}>
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
              <TouchableOpacity key={idx} activeOpacity={0.9} onPress={onPress}>
                <Image
                  source={{ uri }}
                  style={s.feedImage}
                  onError={() => setImgErrors(prev => ({ ...prev, [idx]: true }))}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      )}

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
          <TouchableOpacity style={s.reactionItem} activeOpacity={0.7} onPress={onPress}>
            <Ionicons name="chatbubble-outline" size={15} color={T2} />
            <Text style={s.reactionCount}>{item.comments}</Text>
          </TouchableOpacity>
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

      {/* ... 드롭다운 메뉴 */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={s.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={[s.menuBox, { top: menuPos.top, right: menuPos.right }]}>
            {isMyPost ? (
              <>
                <TouchableOpacity
                  style={s.menuItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setMenuVisible(false);
                    router.push({
                      pathname: '/community-write',
                      params: { id: String(item.id), category: item.category, title: item.title, content: item.content },
                    });
                  }}
                >
                  <Ionicons name="pencil-outline" size={16} color={T1} />
                  <Text style={s.menuItemText}>수정</Text>
                </TouchableOpacity>
                <View style={s.menuDivider} />
                <TouchableOpacity
                  style={s.menuItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setMenuVisible(false);
                    Alert.alert('게시글 삭제', '이 게시글을 삭제하시겠어요?', [
                      { text: '취소', style: 'cancel' },
                      {
                        text: '삭제',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await deleteCommunityPost(item.id);
                            onDelete(item.id);
                          } catch {
                            Alert.alert('오류', '삭제에 실패했습니다.');
                          }
                        },
                      },
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={[s.menuItemText, { color: '#EF4444' }]}>삭제</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={s.menuItem}
                  activeOpacity={0.7}
                  onPress={async () => {
                    setMenuVisible(false);
                    if (!item.authorId) return;
                    try {
                      const res = await getOrCreateDirectRoom(item.authorId);
                      if (res.success) {
                        router.push({
                          pathname: '/chatroom',
                          params: {
                            roomId: res.data.id,
                            requestTitle: item.author,
                            partnerNickname: item.author,
                            partnerProfileImage: toAbsoluteUrl(item.authorProfileImage) ?? '',
                            isDirect: 'true',
                            roomUnreadCount: String(res.data.unreadCount ?? 0),
                          },
                        });
                      }
                    } catch {}
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={T1} />
                  <Text style={s.menuItemText}>채팅하기</Text>
                </TouchableOpacity>
                <View style={s.menuDivider} />
                <TouchableOpacity
                  style={s.menuItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setMenuVisible(false);
                    if (!item.authorId) return;
                    Alert.alert(
                      '차단하기',
                      `${item.author}님을 차단하시겠어요?\n차단한 사용자의 글과 메시지가 보이지 않습니다.`,
                      [
                        { text: '취소', style: 'cancel' },
                        {
                          text: '차단',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await blockUser(item.authorId!);
                              onBlockSuccess?.();
                            } catch {
                              Alert.alert('오류', '차단에 실패했습니다.');
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="ban-outline" size={16} color="#EF4444" />
                  <Text style={[s.menuItemText, { color: '#EF4444' }]}>차단하기</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── 피드 화면 ────────────────────────────────────────────────
function FeedScreen({ category, onCategoryChange }: { category: FilterCategory; onCategoryChange: (cat: FilterCategory) => void }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<CommunityPostDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flatListScrollEnabled, setFlatListScrollEnabled] = useState(true);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('title');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const HEADER_HEIGHT = insets.top + 76;

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

  const handleDelete = useCallback((postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const handleBlockSuccess = useCallback(() => { fetchPosts(); }, [fetchPosts]);

  const handleImageScrollStart = useCallback(() => setFlatListScrollEnabled(false), []);
  const handleImageScrollEnd = useCallback(() => setFlatListScrollEnabled(true), []);

  const categoryFiltered = (() => {
    const visible = posts.filter((p) => {
      if (p.category !== 'QUESTION') return true;
      // 로컬 탭: 같은 국적끼리만
      // 한국인(nationality 없음)은 한국인끼리, 외국인은 nationality 코드가 같은 사람끼리
      const myNationality = user?.nationality ?? null;
      const postNationality = p.authorNationality ?? null;
      if (myNationality === null && postNationality === null) return true; // 둘 다 한국인
      return myNationality !== null && myNationality === postNationality;
    });
    if (category === 'ALL') return visible;
    return visible.filter((p) => p.category === category);
  })();

  const filteredPosts = searchQuery.trim()
    ? categoryFiltered.filter((p) => {
        const q = searchQuery.trim().toLowerCase();
        if (searchMode === 'title') return p.title.toLowerCase().includes(q);
        return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
      })
    : categoryFiltered;

  const menuItem = CATEGORY_MENU.find((m) => m.key === category);
  const headerTitle = menuItem?.label ?? '게시판';
  const headerColor = menuItem?.color ?? T1;

  const renderPost = useCallback(({ item }: { item: CommunityPostDto }) => (
    <FeedCard
      item={item}
      onPress={() => router.push({ pathname: '/community-post', params: { id: item.id } })}
      onLike={handleLike}
      onDelete={handleDelete}
      onBlockSuccess={handleBlockSuccess}
      onImageScrollStart={handleImageScrollStart}
      onImageScrollEnd={handleImageScrollEnd}
    />
  ), [router, handleLike, handleDelete, handleBlockSuccess, handleImageScrollStart, handleImageScrollEnd]);

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
      <View style={[s.stickyHeader, { paddingTop: insets.top + 10 }]}>
        <View style={s.header}>
          {/* 카테고리 선택 버튼 */}
          <TouchableOpacity style={s.catSelectorBtn} onPress={() => setDropdownVisible(true)} activeOpacity={0.8}>
            <View style={[s.catSelectorIcon, { backgroundColor: menuItem?.bg ?? BG }]}>
              <Ionicons name={(menuItem?.icon ?? 'apps-outline') as never} size={16} color={menuItem?.color ?? T1} />
            </View>
            <Text style={[s.catSelectorLabel, { color: menuItem?.color ?? T1 }]}>{headerTitle}</Text>
            <Ionicons name="chevron-down" size={14} color={T2} />
          </TouchableOpacity>
          {/* 검색바 */}
          <View style={s.headerSearchBar}>
            <Ionicons name="search-outline" size={16} color={T2} />
            <TextInput
              ref={searchInputRef}
              style={s.headerSearchInput}
              placeholder={`${headerTitle} 검색`}
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
            <Ionicons name="create-outline" size={24} color={T1} />
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
        <View style={s.headerDivider} />
        {isLoading ? <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 40 }} /> : null}
      </View>

      {/* 카테고리 드롭다운 모달 */}
      <Modal visible={dropdownVisible} transparent animationType="fade" onRequestClose={() => setDropdownVisible(false)}>
        <TouchableOpacity style={s.dropdownBackdrop} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
          <View style={[s.dropdownPanel, { top: insets.top + 56 }]}>
            {CATEGORY_MENU.map((item, idx) => {
              const isActive = item.key === category;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[s.dropdownItem, idx < CATEGORY_MENU.length - 1 && s.dropdownItemBorder]}
                  onPress={() => { onCategoryChange(item.key as FilterCategory); setDropdownVisible(false); }}
                  activeOpacity={0.7}
                >
                  <View style={[s.dropdownIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon as never} size={18} color={item.color} />
                  </View>
                  <Text style={[s.dropdownLabel, isActive && { color: item.color, fontWeight: '800' }]}>{item.label}</Text>
                  {isActive && <Ionicons name="checkmark" size={16} color={item.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── 메인 화면 (라우팅 허브) ──────────────────────────────────
export default function CommunityScreen() {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');

  return (
    <FeedScreen
      category={activeCategory}
      onCategoryChange={(cat) => setActiveCategory(cat)}
    />
  );
}

// ── 카테고리 홈 스타일 ────────────────────────────────────────
const cs = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: sc(20), paddingVertical: sc(12),
  },
  headerTitle: { fontSize: sc(22), fontWeight: '800', color: T1 },
  writeBtn: { padding: sc(4) },

  scroll: { paddingHorizontal: sc(16), paddingTop: sc(8), paddingBottom: sc(40) },

  section: {
    backgroundColor: '#fff',
    borderRadius: sc(16),
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginTop: sc(8),
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: sc(16), paddingVertical: sc(16), gap: sc(14),
  },
  menuItemBorder: {
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  iconWrap: {
    width: sc(42), height: sc(42), borderRadius: sc(12),
    justifyContent: 'center', alignItems: 'center',
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: sc(15), fontWeight: '700', color: T1 },
  menuDesc: { fontSize: sc(12), color: T2, marginTop: sc(2) },
});

// ── 피드 스타일 ───────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 10, backgroundColor: '#fff',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sc(16),
    paddingVertical: sc(10),
    backgroundColor: '#fff',
    gap: sc(10),
  },
  catSelectorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: sc(6),
    paddingHorizontal: sc(10), paddingVertical: sc(8),
    borderRadius: sc(22), backgroundColor: BG,
    flexShrink: 0,
  },
  catSelectorIcon: {
    width: sc(28), height: sc(28), borderRadius: sc(8),
    justifyContent: 'center', alignItems: 'center',
  },
  catSelectorLabel: { fontSize: sc(14), fontWeight: '800' },

  dropdownBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.25)',
  },
  dropdownPanel: {
    position: 'absolute', left: 12,
    backgroundColor: '#fff',
    borderRadius: sc(16),
    borderWidth: 1, borderColor: BORDER,
    minWidth: sc(200),
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(4) },
    shadowOpacity: 0.15, shadowRadius: sc(12),
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: sc(12),
    paddingHorizontal: sc(14), paddingVertical: sc(13),
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  dropdownIcon: {
    width: sc(34), height: sc(34), borderRadius: sc(10),
    justifyContent: 'center', alignItems: 'center',
  },
  dropdownLabel: { flex: 1, fontSize: sc(15), fontWeight: '600', color: T1 },
  headerSearchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: sc(8),
    backgroundColor: BG, borderRadius: sc(22),
    paddingHorizontal: sc(14), paddingVertical: sc(10),
  },
  headerSearchInput: { flex: 1, fontSize: sc(15), color: T1, padding: 0 },
  writeBtn: { padding: sc(4) },

  // ── Search mode ──
  searchModeRow: {
    flexDirection: 'row', gap: sc(6),
    paddingHorizontal: sc(16), paddingBottom: sc(8),
    backgroundColor: '#fff',
  },
  modeChip: {
    paddingHorizontal: sc(14), paddingVertical: sc(6),
    borderRadius: sc(16), backgroundColor: BG,
    borderWidth: 1, borderColor: BORDER,
  },
  modeChipOn: { backgroundColor: BLUE, borderColor: BLUE },
  modeChipText: { fontSize: sc(13), fontWeight: '700', color: BLUE_MID },
  modeChipTextOn: { color: '#fff' },

  // ── Category title bar ──
  catTitleBar: {
    paddingHorizontal: sc(16), paddingVertical: sc(8),
    borderLeftWidth: 3, marginHorizontal: sc(16), marginBottom: sc(4),
  },
  catTitleText: { fontSize: sc(14), fontWeight: '800' },

  headerDivider: { height: 1, backgroundColor: BORDER },

  // ── List ──
  list: { paddingBottom: sc(100) },
  postDivider: { height: sc(8), backgroundColor: BG },

  // ── Feed Card ──
  feedCard: {
    backgroundColor: '#fff',
    paddingHorizontal: sc(16),
    paddingTop: sc(16),
    paddingBottom: sc(4),
  },

  feedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: sc(10),
    gap: sc(10),
  },
  feedAvatarWrap: {
    width: sc(44), height: sc(44), borderRadius: sc(22),
    overflow: 'hidden', flexShrink: 0,
  },
  feedAvatar: { width: sc(44), height: sc(44), borderRadius: sc(22) },
  feedAvatarText: { fontSize: sc(18), fontWeight: '700', color: '#fff' },
  feedAuthorInfo: { flex: 1, gap: sc(4) },
  feedNameRow: { flexDirection: 'row', alignItems: 'center', gap: sc(6) },
  feedAuthorName: { fontSize: sc(15), fontWeight: '700', color: T1 },
  feedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: sc(6), flexWrap: 'wrap' },
  feedTime: { fontSize: sc(12), color: T2 },
  feedUniv: { fontSize: sc(12), color: T2, flex: 1 },
  moreBtn: { padding: sc(4) },

  catBadge: { paddingHorizontal: sc(8), paddingVertical: sc(2), borderRadius: sc(6) },
  catBadgeText: { fontSize: sc(11), fontWeight: '700' },

  hotBadge: { backgroundColor: '#FFF3E8', borderRadius: sc(8), paddingHorizontal: sc(7), paddingVertical: sc(2) },
  hotBadgeText: { fontSize: sc(11), fontWeight: '700', color: ORANGE },

  feedBody: { marginBottom: sc(10) },
  feedTitle: { fontSize: sc(15), fontWeight: '700', color: T1, lineHeight: sc(22), marginBottom: sc(4) },
  feedContent: { fontSize: sc(14), color: T2, lineHeight: sc(20) },

  imageScroll: { marginBottom: sc(10) },
  feedImage: {
    width: sc(200), height: sc(200), borderRadius: sc(12),
    marginRight: sc(8), backgroundColor: '#E8EDF5',
  },

  feedFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: sc(10), borderTopWidth: 1, borderTopColor: '#F0F3F8', marginTop: sc(6),
  },
  reactionLeft: { flexDirection: 'row', gap: sc(16) },
  reactionRight: { flexDirection: 'row', gap: sc(12) },
  reactionItem: { flexDirection: 'row', alignItems: 'center', gap: sc(5) },
  reactionCount: { fontSize: sc(13), color: T2, fontWeight: '600' },
  iconBtn: { padding: sc(4) },

  empty: { alignItems: 'center', paddingVertical: sc(60), gap: sc(8) },
  emptyEmoji: { fontSize: sc(44), marginBottom: sc(4) },
  emptyTitle: { fontSize: sc(18), fontWeight: '700', color: T1 },
  emptySub: { fontSize: sc(16), color: BLUE_MID },

  // ── Dropdown menu ──
  menuOverlay: { flex: 1 },
  menuBox: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: sc(12), borderWidth: sc(1), borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(4) },
    shadowOpacity: 0.12, shadowRadius: sc(12), elevation: 8,
    minWidth: sc(140), overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: sc(10),
    paddingHorizontal: sc(16), paddingVertical: sc(14),
  },
  menuItemText: { fontSize: sc(14), fontWeight: '600', color: T1 },
  menuDivider: { height: sc(1), backgroundColor: BORDER },
});
