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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import {
  getMyRequests,
  getHelpedRequests,
  startHelpRequest,
  rejectHelper,
} from '../../services/helpService';
import type { HelpRequest } from '../../types';

const BLUE     = '#3B6FE8';
const BLUE_BG  = '#F5F8FF';
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

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isInternational = user?.userType === 'INTERNATIONAL';

  const [requests, setRequests]     = useState<HelpRequest[]>([]);
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
    }, [clearUnread, fetchData])
  );

  const fetchData = useCallback(async () => {
    try {
      const res = isInternational ? await getMyRequests() : await getHelpedRequests();
      if (res.success) setRequests(res.data);
    } catch {
      // 조회 실패 무시
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [isInternational]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleAccept = async (req: HelpRequest) => {
    setActioningId(req.id);
    try {
      const res = await startHelpRequest(req.id);
      if (res.success) {
        router.push({
          pathname: '/chatroom',
          params: {
            roomId: req.id,
            requestTitle: req.title,
            partnerNickname: req.helper?.nickname ?? '',
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

  const handleReject = (req: HelpRequest) => {
    Alert.alert(
      '도움 거절',
      `${req.helper?.nickname ?? ''}님의 도움 신청을 거절하시겠어요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '거절',
          style: 'destructive',
          onPress: async () => {
            setActioningId(req.id);
            try {
              const res = await rejectHelper(req.id);
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

  const goToChat = (req: HelpRequest) => {
    const partnerNickname = isInternational
      ? (req.helper?.nickname ?? '')
      : req.requester.nickname;
    router.push({
      pathname: '/chatroom',
      params: {
        roomId: req.id,
        requestTitle: req.title,
        partnerNickname,
        requestStatus: req.status,
        requesterId: req.requester.id,
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
      if (filter === 'ALL')         return r.status === 'MATCHED' || r.status === 'IN_PROGRESS';
      if (filter === 'IN_PROGRESS') return r.status === 'IN_PROGRESS';
      if (filter === 'COMPLETED')   return r.status === 'COMPLETED';
      return false;
    })
    .sort((a, b) => {
      if (a.status === 'MATCHED' && b.status !== 'MATCHED') return -1;
      if (b.status === 'MATCHED' && a.status !== 'MATCHED') return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const partner = isInternational ? r.helper?.nickname : r.requester.nickname;
      return partner?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ?? false;
    });

  const getPartner = (item: HelpRequest) =>
    isInternational ? item.helper : item.requester;

  const renderItem = ({ item }: { item: HelpRequest }) => {
    const partner        = getPartner(item);
    const name           = partner?.nickname ?? '?';
    const isActioning    = actioningId === item.id;
    const isOnline       = item.status === 'IN_PROGRESS' || item.status === 'MATCHED';
    const isCompleted    = item.status === 'COMPLETED';
    const isMatchPending = item.status === 'MATCHED';

    const statusLabel = isCompleted ? '완료' : '진행중';
    const statusBg    = isCompleted ? '#F0F4F0' : BLUE_L;
    const statusColor = isCompleted ? T3 : BLUE;

    return (
      <TouchableOpacity
        style={[s.item, isCompleted && s.itemDimmed]}
        onPress={() => goToChat(item)}
        activeOpacity={0.85}
      >
        {/* 아바타 */}
        <View style={s.avatarWrap}>
          <View style={[s.avatar, { backgroundColor: avatarColor(name) }]}>
            <Text style={s.avatarText}>{name.charAt(0)}</Text>
          </View>
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
            <Text style={s.itemTime}>{formatTime(item.updatedAt)}</Text>
          </View>
          <View style={s.itemBottom}>
            <Text style={s.itemPreview} numberOfLines={1}>
              {isMatchPending
                ? (isInternational ? '새 도움 신청이 도착했어요!' : '수락을 기다리고 있어요')
                : item.title}
            </Text>
            {isMatchPending && !isActioning && (
              <View style={s.unreadDot} />
            )}
          </View>
          {/* MATCHED + 외국인: 수락/거절 */}
          {isMatchPending && isInternational && (
            <View style={s.actionRow}>
              <TouchableOpacity
                style={s.rejectBtn}
                onPress={() => handleReject(item)}
                disabled={isActioning}
              >
                <Text style={s.rejectBtnText}>거절</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.acceptBtn, isActioning && s.btnDisabled]}
                onPress={() => handleAccept(item)}
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
          data={visibleItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        />
      )}
    </View>
  );
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
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
  headerTitle: { fontSize: 17, fontWeight: '900', color: T1, letterSpacing: -0.5 },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16,
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
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingVertical: 12 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
  },
  chipOn:      { backgroundColor: BLUE, borderColor: BLUE },
  chipText:    { fontSize: 10, fontWeight: '700', color: T2 },
  chipTextOn:  { color: '#fff' },

  // ── List ──
  list:      { paddingVertical: 0 },
  separator: { height: 0, backgroundColor: BLUE_L },

  // ── Item ──
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BLUE_L,
    backgroundColor: BLUE_BG,
  },
  itemDimmed: { opacity: 0.7 },

  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: BLUE_BG,
  },

  itemBody: { flex: 1, gap: 3 },
  itemTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 3,
  },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName:   { fontSize: 13, fontWeight: '800', color: T1 },
  statusBadge:{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  statusText: { fontSize: 9, fontWeight: '700' },
  itemTime:   { fontSize: 10, color: T2 },

  itemBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPreview: { fontSize: 11, color: T2, fontWeight: '500', flex: 1 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: BLUE, flexShrink: 0,
  },

  actionRow:     { flexDirection: 'row', gap: 7, marginTop: 8 },
  rejectBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: BORDER, alignItems: 'center',
  },
  rejectBtnText: { fontSize: 12, fontWeight: '700', color: T3 },
  acceptBtn: {
    flex: 2, paddingVertical: 7, borderRadius: 8,
    backgroundColor: BLUE, alignItems: 'center',
  },
  acceptBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  btnDisabled:   { opacity: 0.6 },

  // ── Empty ──
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 32 },
  emptyIcon:  { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: T1 },
  emptySub:   { fontSize: 14, color: T2, textAlign: 'center', lineHeight: 22 },
});
