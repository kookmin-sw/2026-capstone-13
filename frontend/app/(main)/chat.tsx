// 채팅 탭: 도움 신청 수락/거절 + 채팅방 목록
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { s as sc } from '../../utils/scale';
import { getInitial } from '../../utils/getInitial';
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
import { getDirectChatRooms, type DirectChatRoomResponse } from '../../services/directChatService';

const BLUE     = '#3B6FE8';
const BLUE_BG  = '#FFFFFF';
const BLUE_L   = '#EEF4FF';
const BORDER   = '#D0E0F8';
const T1       = '#0C1C3C';
const T2       = '#A8C8FA';
const T3       = '#6B9DF0';
const GREEN    = '#22C55E';

type FilterTab = 'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'DIRECT';

const FILTER_TAB_KEYS: { key: FilterTab; labelKey: string }[] = [
  { key: 'DIRECT',      labelKey: 'chat.filterDirect'      },
  { key: 'IN_PROGRESS', labelKey: 'chat.filterInProgress'  },
  { key: 'COMPLETED',   labelKey: 'home.completed'         },
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
      <Text style={pa.text}>{getInitial(name)}</Text>
    </View>
  );
}

const pa = StyleSheet.create({
  img:      { width: sc(52), height: sc(52), borderRadius: sc(26) },
  fallback: { width: sc(52), height: sc(52), borderRadius: sc(26), justifyContent: 'center', alignItems: 'center' },
  text:     { fontSize: sc(18), fontWeight: '800', color: '#fff' },
});

export default function ChatScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const isInternational = user?.userType !== 'KOREAN';

  const [requests, setRequests]         = useState<ChatRoomResponse[]>([]);
  const [directRooms, setDirectRooms]   = useState<DirectChatRoomResponse[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [filter, setFilter]         = useState<FilterTab>('DIRECT');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const searchInputRef = useRef<TextInput>(null);

  const { setUnreadCount, hasLeft, rejoinRoom, roomUnreadCounts, initRoomUnreadCounts } = useChatStore();
  const myId = Number(user?.id);

  const fetchData = useCallback(async () => {
    try {
      const [helpRes, directRes] = await Promise.allSettled([getChatRooms(), getDirectChatRooms()]);
      if (helpRes.status === 'fulfilled' && helpRes.value.success) {
        const data = helpRes.value.data;
        setRequests(data);
        if (isInternational) {
          data.forEach((r) => {
            if (r.status === 'MATCHED' && hasLeft(r.id, myId)) rejoinRoom(r.id, myId);
          });
        }
        const helpUnread = data
          .filter((r) => !hasLeft(r.id, myId) && r.status !== 'WAITING')
          .reduce((sum, r) => sum + (r.unreadCount ?? 0), 0);
        const directUnread = directRes.status === 'fulfilled' && directRes.value.success
          ? directRes.value.data.filter((r) => !hasLeft(r.id, myId)).reduce((sum, r) => sum + (r.unreadCount ?? 0), 0)
          : 0;
        setUnreadCount(helpUnread + directUnread);

        // 방별 안읽음 카운트 스토어 초기화
        const counts: Record<number, number> = {};
        data.forEach((r) => { counts[r.id] = r.unreadCount ?? 0; });
        if (directRes.status === 'fulfilled' && directRes.value.success) {
          directRes.value.data.forEach((r) => { counts[r.id] = r.unreadCount ?? 0; });
        }
        initRoomUnreadCounts(counts);
      }
      if (directRes.status === 'fulfilled' && directRes.value.success) {
        setDirectRooms(directRes.value.data);
      }
    } catch {
      // 조회 실패 무시
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [setUnreadCount, hasLeft, rejoinRoom, isInternational, myId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

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
            partnerProfileImage: toAbsoluteUrl(room.partnerProfileImage) ?? '',
            requestStatus: 'IN_PROGRESS',
            requesterId: String(myId),
            roomUnreadCount: String(room.unreadCount ?? 0),
            partnerId: String(room.partnerId ?? ''),
            partnerPreferredLanguage: room.partnerPreferredLanguage ?? 'en',
          },
        });
        fetchData();
      } else {
        Alert.alert(t('chat.failed'), res.message);
      }
    } catch {
      Alert.alert(t('common.error'), t('errors.serverError'));
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = (room: ChatRoomResponse) => {
    Alert.alert(
      t('chat.rejectHelpTitle'),
      t('chat.rejectHelpMsg', { name: room.partnerNickname }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.decline'),
          style: 'destructive',
          onPress: async () => {
            setActioningId(room.id);
            try {
              const res = await rejectHelper(room.id);
              if (res.success) fetchData();
              else Alert.alert(t('chat.failed'), res.message);
            } catch {
              Alert.alert(t('common.error'), t('errors.serverError'));
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
        partnerProfileImage: toAbsoluteUrl(room.partnerProfileImage) ?? '',
        requestStatus: room.status,
        requesterId,
        partnerUserId: String(room.partnerId),
        roomUnreadCount: String(room.unreadCount ?? 0),
        partnerId: String(room.partnerId ?? ''),
        partnerPreferredLanguage: room.partnerPreferredLanguage ?? 'en',
      },
    });
  };

  const goToDirectChat = (room: DirectChatRoomResponse) => {
    router.push({
      pathname: '/chatroom',
      params: {
        roomId: room.id,
        requestTitle: room.partnerNickname,
        partnerNickname: room.partnerNickname,
        partnerProfileImage: toAbsoluteUrl(room.partnerProfileImage) ?? '',
        partnerUserId: String(room.partnerId),
        isDirect: 'true',
        roomUnreadCount: String(room.unreadCount ?? 0),
      },
    });
  };

  const openSearch = () => {
    setSearchVisible(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };
  const closeSearch = () => { setSearchVisible(false); setSearchQuery(''); };

  const visibleItems = filter === 'DIRECT'
    ? []
    : requests
        .filter((r) => {
          if (hasLeft(r.id, myId)) return false;
          if (filter === 'ALL')         return r.status === 'MATCHED' || r.status === 'IN_PROGRESS' || r.status === 'COMPLETED' || r.status === 'WAITING';
          if (filter === 'IN_PROGRESS') return r.status === 'IN_PROGRESS' || r.status === 'WAITING' || r.status === 'MATCHED';
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

  const visibleDirectRooms = directRooms
    .filter((r) => !hasLeft(r.id, myId))
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      return r.partnerNickname.toLowerCase().includes(searchQuery.trim().toLowerCase());
    });

  const tabUnread: Record<FilterTab, number> = {
    ALL: 0,
    DIRECT: directRooms
      .filter((r) => !hasLeft(r.id, myId))
      .reduce((sum, r) => sum + (roomUnreadCounts[r.id] ?? r.unreadCount ?? 0), 0),
    IN_PROGRESS: requests
      .filter((r) => !hasLeft(r.id, myId) && (r.status === 'IN_PROGRESS' || r.status === 'WAITING' || r.status === 'MATCHED'))
      .reduce((sum, r) => sum + (roomUnreadCounts[r.id] ?? r.unreadCount ?? 0), 0),
    COMPLETED: requests
      .filter((r) => !hasLeft(r.id, myId) && r.status === 'COMPLETED')
      .reduce((sum, r) => sum + (roomUnreadCounts[r.id] ?? r.unreadCount ?? 0), 0),
  };

  // 섹션 헤더 포함 리스트 데이터
  type ListData = ChatRoomResponse | DirectChatRoomResponse | { type: 'sectionHeader'; label: string; id: string };

  const listDataWithSections: ListData[] = (() => {
    if (filter === 'DIRECT') return visibleDirectRooms;
    if (filter !== 'ALL') return visibleItems;
    const inProgress = visibleItems.filter(r => r.status === 'IN_PROGRESS' || r.status === 'MATCHED');
    const completed  = visibleItems.filter(r => r.status === 'COMPLETED');
    const waiting    = visibleItems.filter(r => r.status === 'WAITING');
    const result: ListData[] = [];
    if (visibleDirectRooms.length > 0) {
      result.push({ type: 'sectionHeader', label: `${t('chat.filterDirect')} ${visibleDirectRooms.length}`, id: 'sec-direct' });
      result.push(...visibleDirectRooms);
    }
    if (inProgress.length > 0) {
      result.push({ type: 'sectionHeader', label: `${t('chat.filterInProgress')} ${inProgress.length}`, id: 'sec-progress' });
      result.push(...inProgress);
    }
    if (completed.length > 0) {
      result.push({ type: 'sectionHeader', label: `${t('home.completed')} ${completed.length}`, id: 'sec-done' });
      result.push(...completed);
    }
    if (waiting.length > 0) {
      result.push({ type: 'sectionHeader', label: `${t('chat.statusLeft')} ${waiting.length}`, id: 'sec-waiting' });
      result.push(...waiting);
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
      t('chat.leave'),
      t('chat.noChats'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => swipeableRefs.current.get(item.id)?.close(),
        },
        {
          text: t('chat.leave'),
          style: 'destructive',
          onPress: () => {
            if (user) {
              useChatStore.getState().leaveRoom(item.id, Number(user.id));
              setRequests((prev) => prev.filter((r) => r.id !== item.id));
              const roomUnread = item.unreadCount ?? 0;
              if (roomUnread > 0) setUnreadCount(Math.max(0, useChatStore.getState().unreadCount - roomUnread));
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (item: ChatRoomResponse) => () => (
    <TouchableOpacity style={s.deleteAction} onPress={() => handleDelete(item)}>
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text style={s.deleteActionText}>{t('chat.leave')}</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: ListData }) => {
    // 섹션 헤더
    if ('type' in item && item.type === 'sectionHeader') {
      return <Text style={s.sectionLabel}>{item.label}</Text>;
    }

    // 일반 DM 방
    if (!('status' in item)) {
      const room = item as DirectChatRoomResponse;
      const name = room.partnerNickname;
      return (
        <Swipeable
          ref={(ref) => {
            if (ref) swipeableRefs.current.set(room.id, ref);
            else swipeableRefs.current.delete(room.id);
          }}
          renderRightActions={() => (
            <TouchableOpacity style={s.deleteAction} onPress={() => {
              if (user) {
                useChatStore.getState().leaveRoom(room.id, Number(user.id));
                setDirectRooms((prev) => prev.filter((r) => r.id !== room.id));
              }
            }}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
              <Text style={s.deleteActionText}>{t('chat.leave')}</Text>
            </TouchableOpacity>
          )}
          rightThreshold={60}
          overshootRight={false}
        >
          <TouchableOpacity
            style={s.item}
            onPress={() => goToDirectChat(room)}
            activeOpacity={0.85}
          >
            <View style={s.avatarWrap}>
              <PartnerAvatar profileUrl={toAbsoluteUrl(room.partnerProfileImage) ?? undefined} name={name} />
            </View>
            <View style={s.itemBody}>
              <View style={s.itemTop}>
                <View style={s.itemTitleRow}>
                  <Text style={s.itemName}>{name}</Text>
                </View>
                <Text style={s.itemTime}>{formatTime(room.lastMessageTime ?? '', t)}</Text>
              </View>
              <View style={s.itemBottom}>
                <Text style={s.itemPreview} numberOfLines={1}>{room.lastMessage ?? t('chat.startMessage')}</Text>
                {(roomUnreadCounts[room.id] ?? room.unreadCount) > 0 && (
                  <View style={s.unreadBadge}>
                    <Text style={s.unreadText}>{(roomUnreadCounts[room.id] ?? room.unreadCount) > 99 ? '99+' : (roomUnreadCounts[room.id] ?? room.unreadCount)}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Swipeable>
      );
    }

    const room           = item as ChatRoomResponse;
    const name           = room.partnerNickname;
    const isActioning    = actioningId === room.id;
    const isOnline       = room.status === 'IN_PROGRESS' || room.status === 'MATCHED';
    const isCompleted    = room.status === 'COMPLETED';
    const isWaiting      = room.status === 'WAITING';
    const isMatchPending = room.status === 'MATCHED';

    const statusLabel = isCompleted ? t('home.completed') : isWaiting ? t('chat.statusLeft') : t('chat.filterInProgress');
    const statusBg    = isCompleted ? '#F0F4F8' : isWaiting ? '#FEF3C7' : BLUE_L;
    const statusColor = isCompleted ? T3 : isWaiting ? '#D97706' : BLUE;

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
              </View>
              <Text style={s.itemTime}>{formatTime(room.lastMessageTime ?? '', t)}</Text>
            </View>
            <View style={s.itemBottom}>
              <Text style={s.itemPreview} numberOfLines={1}>
                {isMatchPending
                  ? (isInternational ? t('chat.newHelpArrived') : t('chat.waitingAccept'))
                  : room.lastMessage?.startsWith('SYS_LEAVE:')
                    ? t('chat.partnerLeft')
                    : (room.lastMessage ?? room.title)}
              </Text>
              {(roomUnreadCounts[room.id] ?? room.unreadCount) > 0 && !isActioning && (
                <View style={s.unreadBadge}>
                  <Text style={s.unreadText}>{(roomUnreadCounts[room.id] ?? room.unreadCount) > 99 ? '99+' : (roomUnreadCounts[room.id] ?? room.unreadCount)}</Text>
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
                  <Text style={s.rejectBtnText}>{t('chat.decline')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.acceptBtn, isActioning && s.btnDisabled]}
                  onPress={() => handleAccept(room)}
                  disabled={isActioning}
                >
                  {isActioning
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.acceptBtnText}>{t('chat.accept')}</Text>
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
        <Text style={s.headerTitle}>{t('chat.title')}</Text>
        <TouchableOpacity style={s.iconBtn} onPress={openSearch}>
          <Ionicons name="search-outline" size={22} color={T3} />
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
              placeholder={t('chat.searchByName')}
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
            <Text style={s.searchCancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.filterRow}>
        {FILTER_TAB_KEYS.map(({ key, labelKey }) => {
          const unread = tabUnread[key];
          const isOn = filter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[s.chip, isOn && s.chipOn]}
              onPress={() => setFilter(key)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, isOn && s.chipTextOn]}>{t(labelKey)}</Text>
              {unread > 0 && (
                <View style={[s.tabBadge, isOn && s.tabBadgeOn]}>
                  <Text style={[s.tabBadgeText, isOn && s.tabBadgeTextOn]}>
                    {unread > 99 ? '99+' : unread}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={s.divider} />

      {listDataWithSections.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>💬</Text>
          <Text style={s.emptyTitle}>{t('chat.noChatsYet')}</Text>
          <Text style={s.emptySub}>
            {filter === 'DIRECT'
              ? t('chat.emptyDirectHint')
              : isInternational
                ? t('chat.emptyInternationalHint')
                : t('chat.emptyKoreanHint')}
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

type TFunction = (key: string, opts?: Record<string, unknown>) => string;

function formatTime(iso: string, t: TFunction): string {
  if (!iso) return '';
  const utc = iso.includes('Z') || iso.includes('+') ? iso : iso + 'Z';
  const ms = new Date(utc.replace(/\.(\d+)Z/, (_, d) => '.' + (d + '000').slice(0, 3) + 'Z')).getTime();
  if (isNaN(ms)) return '';
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return t('time.justNow');
  if (m < 60) return t('time.minutesAgo', { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('time.hoursAgo', { h });
  return t('time.daysAgo', { d: Math.floor(h / 24) });
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLUE_BG },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header ──
  header: {
    backgroundColor: BLUE_BG,
    paddingTop: Platform.OS === 'ios' ? sc(56) : sc(28),
    paddingBottom: 0,
    paddingHorizontal: sc(22),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: sc(24), fontWeight: '900', color: T1, letterSpacing: -0.6 },
  iconBtn: {
    width: sc(34), height: sc(34), borderRadius: sc(17),
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
    marginTop: sc(4),
  },

  // ── Search ──
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: sc(8),
    paddingHorizontal: sc(14), paddingTop: sc(8), paddingBottom: sc(4),
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: sc(8),
    backgroundColor: '#fff', borderRadius: sc(12),
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: sc(12), paddingVertical: sc(8),
  },
  searchInput: { flex: 1, fontSize: sc(13), color: T1, padding: 0 },
  searchCancel: { paddingHorizontal: sc(4) },
  searchCancelText: { fontSize: sc(13), color: BLUE, fontWeight: '700' },

  // ── Filter ──
  filterRow: { flexDirection: 'row', gap: sc(8), paddingHorizontal: sc(22), paddingTop: sc(8), paddingBottom: sc(14) },
  divider: { height: 1, backgroundColor: BORDER },
  chip: {
    paddingHorizontal: sc(14), paddingVertical: sc(6),
    borderRadius: sc(22), backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'center', gap: sc(5),
  },
  chipOn:          { backgroundColor: BLUE, borderColor: BLUE },
  chipText:        { fontSize: sc(13), fontWeight: '700', color: T2 },
  chipTextOn:      { color: '#fff' },
  tabBadge:        { minWidth: sc(18), height: sc(18), borderRadius: sc(9), backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center', paddingHorizontal: sc(4) },
  tabBadgeOn:      { backgroundColor: '#fff' },
  tabBadgeText:    { fontSize: sc(10), fontWeight: '800', color: '#fff' },
  tabBadgeTextOn:  { color: BLUE },

  // ── List ──
  list:      { paddingVertical: 0, paddingBottom: sc(110) },
  separator: { height: 0 },

  // ── Section label ──
  sectionLabel: {
    fontSize: sc(12), fontWeight: '700', color: T2,
    letterSpacing: 0.3,
    paddingHorizontal: sc(22), paddingVertical: sc(8),
    backgroundColor: BLUE_BG,
  },

  // ── Item ──
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sc(22),
    paddingVertical: sc(14),
    gap: sc(14),
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4FF',
    backgroundColor: '#FFFFFF',
  },
  itemDimmed: { opacity: 0.55 },

  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: sc(52), height: sc(52), borderRadius: sc(26),
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: sc(18), fontWeight: '800', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: sc(13), height: sc(13), borderRadius: sc(7),
    backgroundColor: '#22C55E', borderWidth: sc(2), borderColor: '#FFFFFF',
  },

  itemBody: { flex: 1, minWidth: 0 },
  itemTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: sc(4),
  },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: sc(7) },
  itemName:   { fontSize: sc(15), fontWeight: '800', color: T1 },
  statusBadge:{ paddingHorizontal: sc(8), paddingVertical: sc(2), borderRadius: sc(6) },
  statusText: { fontSize: sc(10), fontWeight: '700' },
  itemTime:   { fontSize: sc(11), color: T2 },

  itemBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPreview: { fontSize: sc(13), color: T2, fontWeight: '500', flex: 1, marginRight: sc(8) },
  unreadBadge: {
    width: sc(20), height: sc(20), borderRadius: sc(10),
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  unreadText: { fontSize: sc(10), fontWeight: '800', color: '#fff' },

  actionRow:     { flexDirection: 'row', gap: sc(8), marginTop: sc(10) },
  rejectBtn: {
    flex: 1, paddingVertical: sc(10), borderRadius: sc(10),
    borderWidth: 1, borderColor: BORDER, alignItems: 'center',
  },
  rejectBtnText: { fontSize: sc(13), fontWeight: '700', color: T3 },
  acceptBtn: {
    flex: 2, paddingVertical: sc(10), borderRadius: sc(10),
    backgroundColor: BLUE, alignItems: 'center',
  },
  acceptBtnText: { fontSize: sc(13), fontWeight: '700', color: '#fff' },
  btnDisabled:   { opacity: 0.6 },

  // ── Swipe Delete ──
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: sc(90),
    gap: sc(5),
  },
  deleteActionText: { fontSize: sc(12), fontWeight: '700', color: '#fff' },

  // ── Swipe overlay ──
  swipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },

  // ── Empty ──
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: sc(8), paddingHorizontal: sc(32) },
  emptyIcon:  { fontSize: sc(48), marginBottom: sc(8) },
  emptyTitle: { fontSize: sc(17), fontWeight: '700', color: T1 },
  emptySub:   { fontSize: sc(14), color: T2, textAlign: 'center', lineHeight: sc(22) },
});
