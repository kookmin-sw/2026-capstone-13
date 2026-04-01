// 채팅 탭: 도움 신청 수락/거절 + 채팅방 목록
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import {
  startHelpRequest,
  rejectHelper,
} from '../../services/helpService';
import { getChatRooms, type ChatRoomResponse } from '../../services/chatService';

const BLUE     = '#3B6FE8';
const BLUE_BG  = '#FFFFFF';
const BLUE_L   = '#EEF4FF';
const BORDER   = '#D0E0F8';
const T1       = '#0C1C3C';
const T2       = '#A8C8FA';
const T3       = '#6B9DF0';
const GREEN    = '#22C55E';

type FilterTab = 'ALL' | 'IN_PROGRESS' | 'COMPLETED';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL',         label: '전체'   },
  { key: 'IN_PROGRESS', label: '진행중' },
  { key: 'COMPLETED',   label: '완료'   },
];

const AVATAR_COLORS = ['#3B6FE8', '#6B9DF0', '#A8C8FA', '#5B8DEF', '#4A7CE0'];
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

function PartnerAvatar({ profileUrl, name }: { profileUrl?: string; name: string }) {
  const [imgError, setImgError] = useState(false);
  if (profileUrl && !imgError) {
    return (
      <Image
        source={{ uri: profileUrl }}
        style={pa.img}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <View style={[pa.fallback, { backgroundColor: avatarColor(name) }]}>
      <Text style={pa.text}>{name.charAt(0)}</Text>
    </View>
  );
}

const pa = StyleSheet.create({
  img:      { width: 52, height: 52, borderRadius: 26 },
  fallback: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  text:     { fontSize: 18, fontWeight: '800', color: '#fff' },
});

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isInternational = user?.userType !== 'KOREAN';

  const [requests, setRequests]     = useState<ChatRoomResponse[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [filter, setFilter]         = useState<FilterTab>('ALL');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const searchInputRef = useRef<TextInput>(null);

  const { clearUnread, hasLeft } = useChatStore();

  useFocusEffect(
    useCallback(() => {
      clearUnread();
      fetchData();
    }, [clearUnread, fetchData]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  const fetchData = useCallback(async () => {
    try {
      const res = await getChatRooms();
      if (res.success) setRequests(res.data);
    } catch {
      // 조회 실패 무시
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleAccept = async (room: ChatRoomResponse) => {
    setActioningId(room.id);
    try {
      const res = await startHelpRequest(room.id);
      if (res.success) {
        router.push({
          pathname: '/chatroom',
          params: {
            roomId: room.id,
            requestTitle: room.title,
            partnerNickname: room.partnerNickname,
          },
        });
        fetchData();
      } else {
        Alert.alert('실패', res.message);
      }
    } catch {
      Alert.alert('오류', '서버 오류가 발생했습니다.');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = (room: ChatRoomResponse) => {
    Alert.alert(
      '도움 거절',
      `${room.partnerNickname}님의 도움 신청을 거절하시겠어요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '거절',
          style: 'destructive',
          onPress: async () => {
            setActioningId(room.id);
            try {
              const res = await rejectHelper(room.id);
              if (res.success) fetchData();
              else Alert.alert('실패', res.message);
            } catch {
              Alert.alert('오류', '서버 오류가 발생했습니다.');
            } finally {
              setActioningId(null);
            }
          },
        },
      ]
    );
  };

  const goToChat = (room: ChatRoomResponse) => {
    const requesterId = isInternational ? myId : room.partnerId;
    router.push({
      pathname: '/chatroom',
      params: {
        roomId: room.id,
        requestTitle: room.title,
        partnerNickname: room.partnerNickname,
        requestStatus: room.status,
        requesterId,
      },
    });
  };

  const openSearch = () => {
    setSearchVisible(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };
  const closeSearch = () => { setSearchVisible(false); setSearchQuery(''); };

  const myId = Number(user?.id);

  const visibleItems = requests
    .filter((r) => {
      if (hasLeft(r.id, myId)) return false;
      if (filter === 'ALL')         return r.status === 'MATCHED' || r.status === 'IN_PROGRESS' || r.status === 'COMPLETED';
      if (filter === 'IN_PROGRESS') return r.status === 'IN_PROGRESS';
      if (filter === 'COMPLETED')   return r.status === 'COMPLETED';
      return false;
    })
    .sort((a, b) => {
      if (a.status === 'MATCHED' && b.status !== 'MATCHED') return -1;
      if (b.status === 'MATCHED' && a.status !== 'MATCHED') return 1;
      return new Date(b.lastMessageTime ?? 0).getTime() - new Date(a.lastMessageTime ?? 0).getTime();
    })
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      return r.partnerNickname.toLowerCase().includes(searchQuery.trim().toLowerCase());
    });

  // 섹션 헤더 포함 리스트 데이터
  type ListData = ChatRoomResponse | { type: 'sectionHeader'; label: string; id: string };

  const listDataWithSections: ListData[] = (() => {
    if (filter !== 'ALL') return visibleItems;
    const inProgress = visibleItems.filter(r => r.status === 'IN_PROGRESS' || r.status === 'MATCHED');
    const completed  = visibleItems.filter(r => r.status === 'COMPLETED');
    const result: ListData[] = [];
    if (inProgress.length > 0) {
      result.push({ type: 'sectionHeader', label: `진행중 ${inProgress.length}`, id: 'sec-progress' });
      result.push(...inProgress);
    }
    if (completed.length > 0) {
      result.push({ type: 'sectionHeader', label: `완료 ${completed.length}`, id: 'sec-done' });
      result.push(...completed);
    }
    return result;
  })();

  const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());
  const openSwipeableId = useRef<number | null>(null);
  const [isAnySwipeOpen, setIsAnySwipeOpen] = useState(false);

  const closeOpenSwipeable = () => {
    if (openSwipeableId.current !== null) {
      swipeableRefs.current.get(openSwipeableId.current)?.close();
      openSwipeableId.current = null;
      setIsAnySwipeOpen(false);
    }
  };

  const handleDelete = (item: ChatRoomResponse) => {
    Alert.alert(
      '채팅방 나가기',
      '채팅방 목록에서 삭제할까요?',
      [
        {
          text: '취소',
          style: 'cancel',
          onPress: () => swipeableRefs.current.get(item.id)?.close(),
        },
        {
          text: '나가기',
          style: 'destructive',
          onPress: () => {
            if (user) {
              useChatStore.getState().leaveRoom(item.id, Number(user.id));
              setRequests((prev) => prev.filter((r) => r.id !== item.id));
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (item: ChatRoomResponse) => () => (
    <TouchableOpacity style={s.deleteAction} onPress={() => handleDelete(item)}>
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text style={s.deleteActionText}>나가기</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: ListData }) => {
    // 섹션 헤더
    if ('type' in item && item.type === 'sectionHeader') {
      return <Text style={s.sectionLabel}>{item.label}</Text>;
    }

    const room           = item as ChatRoomResponse;
    const name           = room.partnerNickname;
    const isActioning    = actioningId === room.id;
    const isOnline       = room.status === 'IN_PROGRESS' || room.status === 'MATCHED';
    const isCompleted    = room.status === 'COMPLETED';
    const isMatchPending = room.status === 'MATCHED';

    const statusLabel = isCompleted ? '완료' : '진행중';
    const statusBg    = isCompleted ? '#F0F4F8' : BLUE_L;
    const statusColor = isCompleted ? T3 : BLUE;

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(room.id, ref);
          else swipeableRefs.current.delete(room.id);
        }}
        renderRightActions={renderRightActions(room)}
        rightThreshold={60}
        overshootRight={false}
        onSwipeableOpen={() => {
          if (openSwipeableId.current !== null && openSwipeableId.current !== room.id) {
            swipeableRefs.current.get(openSwipeableId.current)?.close();
          }
          openSwipeableId.current = room.id;
          setIsAnySwipeOpen(true);
        }}
        onSwipeableClose={() => {
          if (openSwipeableId.current === room.id) {
            openSwipeableId.current = null;
            setIsAnySwipeOpen(false);
          }
        }}
      >
        <TouchableOpacity
          style={s.item}
          onPress={() => { closeOpenSwipeable(); goToChat(room); }}
          activeOpacity={0.85}
        >
          {/* 아바타 */}
          <View style={s.avatarWrap}>
            <PartnerAvatar profileUrl={toAbsoluteUrl(room.partnerProfileImage) ?? undefined} name={name} />
            {isOnline && <View style={s.onlineDot} />}
          </View>

          {/* 본문 */}
          <View style={s.itemBody}>
            <View style={s.itemTop}>
              <View style={s.itemTitleRow}>
                <Text style={s.itemName}>{name}</Text>
                <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
                  <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
              <Text style={s.itemTime}>{formatTime(room.lastMessageTime ?? '')}</Text>
            </View>
            <View style={s.itemBottom}>
              <Text style={s.itemPreview} numberOfLines={1}>
                {isMatchPending
                  ? (isInternational ? '새 도움 신청이 도착했어요!' : '수락을 기다리고 있어요')
                  : (room.lastMessage ?? room.title)}
              </Text>
              {room.unreadCount > 0 && !isActioning && (
                <View style={s.unreadBadge}>
                  <Text style={s.unreadText}>{room.unreadCount > 99 ? '99+' : room.unreadCount}</Text>
                </View>
              )}
            </View>
            {/* MATCHED + 외국인: 수락/거절 */}
            {isMatchPending && isInternational && (
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={s.rejectBtn}
                  onPress={() => handleReject(room)}
                  disabled={isActioning}
                >
                  <Text style={s.rejectBtnText}>거절</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.acceptBtn, isActioning && s.btnDisabled]}
                  onPress={() => handleAccept(room)}
                  disabled={isActioning}
                >
                  {isActioning
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.acceptBtnText}>수락</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (isLoading) {
    return <View style={s.center}><ActivityIndicator size="large" color={BLUE} /></View>;
  }

  return (
    <View style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.headerTitle}>채팅</Text>
        <TouchableOpacity style={s.iconBtn} onPress={openSearch}>
          <Ionicons name="search-outline" size={14} color={T3} />
        </TouchableOpacity>
      </View>

      {/* 검색 바 */}
      {searchVisible && (
        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={14} color={T2} />
            <TextInput
              ref={searchInputRef}
              style={s.searchInput}
              placeholder="닉네임으로 검색"
              placeholderTextColor={T2}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={14} color={T2} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={s.searchCancel} onPress={closeSearch}>
            <Text style={s.searchCancelText}>취소</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 필터 탭 */}
      <View style={s.filterRow}>
        {FILTER_TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[s.chip, filter === key && s.chipOn]}
            onPress={() => setFilter(key)}
            activeOpacity={0.8}
          >
            <Text style={[s.chipText, filter === key && s.chipTextOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {visibleItems.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>💬</Text>
          <Text style={s.emptyTitle}>아직 채팅이 없어요</Text>
          <Text style={s.emptySub}>
            {isInternational
              ? '도움 요청을 올리면 도움을 줄 분이 나타나요!'
              : '도움 요청 목록에서 도움을 신청해보세요!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listDataWithSections}
          renderItem={renderItem}
          keyExtractor={(item) => 'type' in item ? item.id : item.id.toString()}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
          onScrollBeginDrag={closeOpenSwipeable}
        />
      )}

      {/* 스와이프 열렸을 때 빈 곳 터치하면 닫히는 투명 오버레이 */}
      {isAnySwipeOpen && (
        <TouchableOpacity
          style={s.swipeOverlay}
          onPress={closeOpenSwipeable}
          activeOpacity={1}
        />
      )}
    </View>
  );
}

function formatTime(iso: string): string {
  if (!iso) return '';
  // Railway 서버는 UTC 기준 LocalDateTime → timezone 없으면 Z 붙여서 UTC로 명시
  const utc = iso.includes('Z') || iso.includes('+') ? iso : iso + 'Z';
  const ms = new Date(utc.replace(/\.(\d+)Z/, (_, d) => '.' + (d + '000').slice(0, 3) + 'Z')).getTime();
  if (isNaN(ms)) return '';
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLUE_BG },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header ──
  header: {
    backgroundColor: BLUE_BG,
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 0,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: T1, letterSpacing: -0.6 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Search ──
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: T1, padding: 0 },
  searchCancel: { paddingHorizontal: 4 },
  searchCancelText: { fontSize: 13, color: BLUE, fontWeight: '700' },

  // ── Filter ──
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 22, paddingBottom: 14 },
  chip: {
    paddingHorizontal: 22, paddingVertical: 10,
    borderRadius: 22, backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
  },
  chipOn:      { backgroundColor: BLUE, borderColor: BLUE },
  chipText:    { fontSize: 13, fontWeight: '700', color: T2 },
  chipTextOn:  { color: '#fff' },

  // ── List ──
  list:      { paddingVertical: 0 },
  separator: { height: 0 },

  // ── Section label ──
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: T2,
    letterSpacing: 0.3,
    paddingHorizontal: 22, paddingVertical: 8,
    backgroundColor: BLUE_BG,
  },

  // ── Item ──
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4FF',
    backgroundColor: '#FFFFFF',
  },
  itemDimmed: { opacity: 0.55 },

  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFFFFF',
  },

  itemBody: { flex: 1, minWidth: 0 },
  itemTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  itemName:   { fontSize: 15, fontWeight: '800', color: T1 },
  statusBadge:{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  itemTime:   { fontSize: 11, color: T2 },

  itemBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPreview: { fontSize: 13, color: T2, fontWeight: '500', flex: 1, marginRight: 8 },
  unreadBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  unreadText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  actionRow:     { flexDirection: 'row', gap: 8, marginTop: 10 },
  rejectBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER, alignItems: 'center',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: T3 },
  acceptBtn: {
    flex: 2, paddingVertical: 10, borderRadius: 10,
    backgroundColor: BLUE, alignItems: 'center',
  },
  acceptBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnDisabled:   { opacity: 0.6 },

  // ── Swipe Delete ──
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    gap: 5,
  },
  deleteActionText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // ── Swipe overlay ──
  swipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },

  // ── Empty ──
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 32 },
  emptyIcon:  { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: T1 },
  emptySub:   { fontSize: 14, color: T2, textAlign: 'center', lineHeight: 22 },
});
