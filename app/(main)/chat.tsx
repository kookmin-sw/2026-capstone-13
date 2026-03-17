// 채팅 탭: 도움 신청 수락/거절 + 채팅방 목록
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
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

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isInternational = user?.userType === 'INTERNATIONAL';

  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<number | null>(null);

  const { clearUnread, hasLeft } = useChatStore();

  // 채팅 탭 포커스 시 뱃지 초기화 + 데이터 갱신
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // 외국인: 수락 버튼
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

  // 외국인: 거절 버튼
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
              if (res.success) {
                fetchData();
              } else {
                Alert.alert('실패', res.message);
              }
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

  // 채팅방 이동
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

  // 외국인용: MATCHED(신청 대기) + IN_PROGRESS(채팅 중) 항목 렌더
  const renderInternationalItem = ({ item }: { item: HelpRequest }) => {
    const isActioning = actioningId === item.id;

    if (item.status === 'MATCHED' && item.helper) {
      // 도움 신청이 들어온 상태 → 채팅방에서 수락/거절
      return (
        <TouchableOpacity style={styles.requestCard} onPress={() => goToChat(item)} activeOpacity={0.85}>
          <View style={styles.cardHeader}>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>새 도움 신청</Text>
            </View>
            <Text style={styles.cardTime}>{formatTime(item.updatedAt)}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>

          {/* 신청자 프로필 */}
          <View style={styles.helperProfile}>
            <View style={styles.helperAvatar}>
              <Text style={styles.helperAvatarText}>{item.helper.nickname.charAt(0)}</Text>
            </View>
            <View style={styles.helperInfo}>
              <Text style={styles.helperName}>{item.helper.nickname}</Text>
              <Text style={styles.helperUniv}>{item.helper.university}</Text>
              <Text style={styles.helperStats}>도움 {item.helper.helpCount}회 · ★ {item.helper.rating.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.enterRow}>
            <Text style={styles.enterHint}>채팅방에서 수락 또는 거절할 수 있어요</Text>
            <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      );
    }

    if (item.status === 'IN_PROGRESS') {
      // 채팅 진행 중
      return (
        <TouchableOpacity style={styles.roomCard} onPress={() => goToChat(item)} activeOpacity={0.8}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: '#059669' }]}>
              <Text style={styles.avatarText}>{(item.helper?.nickname ?? '?').charAt(0)}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.roomBody}>
            <View style={styles.roomTop}>
              <Text style={styles.partnerName}>{item.helper?.nickname ?? ''}</Text>
              <Text style={styles.time}>{formatTime(item.updatedAt)}</Text>
            </View>
            <Text style={styles.requestLabel} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.lastMessage}>채팅 진행 중</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      );
    }

    return null;
  };

  // 한국인용: MATCHED(대기 중) + IN_PROGRESS(채팅 중) 항목 렌더
  const renderKoreanItem = ({ item }: { item: HelpRequest }) => {
    if (item.status === 'MATCHED') {
      return (
        <TouchableOpacity style={styles.requestCard} onPress={() => goToChat(item)} activeOpacity={0.85}>
          <View style={styles.cardHeader}>
            <View style={styles.waitBadge}>
              <Text style={styles.waitBadgeText}>수락 대기 중</Text>
            </View>
            <Text style={styles.cardTime}>{formatTime(item.updatedAt)}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.helperProfile}>
            <View style={[styles.helperAvatar, { backgroundColor: PRIMARY }]}>
              <Text style={styles.helperAvatarText}>{item.requester.nickname.charAt(0)}</Text>
            </View>
            <View style={styles.helperInfo}>
              <Text style={styles.helperName}>{item.requester.nickname}</Text>
              <Text style={styles.helperUniv}>{item.requester.university}</Text>
            </View>
          </View>
          <View style={styles.enterRow}>
            <Text style={styles.enterHint}>채팅방에서 상대방의 수락을 기다려요</Text>
            <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      );
    }

    if (item.status === 'IN_PROGRESS') {
      return (
        <TouchableOpacity style={styles.roomCard} onPress={() => goToChat(item)} activeOpacity={0.8}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: PRIMARY }]}>
              <Text style={styles.avatarText}>{item.requester.nickname.charAt(0)}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.roomBody}>
            <View style={styles.roomTop}>
              <Text style={styles.partnerName}>{item.requester.nickname}</Text>
              <Text style={styles.time}>{formatTime(item.updatedAt)}</Text>
            </View>
            <Text style={styles.requestLabel} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.lastMessage}>채팅 진행 중</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      );
    }

    return null;
  };

  const myId = Number(user?.id);
  const visibleItems = requests.filter((r) =>
    (r.status === 'MATCHED' || r.status === 'IN_PROGRESS') &&
    !hasLeft(r.id, myId)
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {visibleItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>아직 채팅이 없어요</Text>
          <Text style={styles.emptySub}>
            {isInternational
              ? '도움 요청을 올리면 도움을 줄 분이 나타나요!'
              : '도움 요청 목록에서 도움을 신청해보세요!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleItems}
          renderItem={isInternational ? renderInternationalItem : renderKoreanItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        />
      )}
    </View>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingVertical: 8 },
  separator: { height: 8, backgroundColor: '#F3F4F8' },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B4B' },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },

  // 신청 카드 (수락/거절)
  requestCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.12)',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  waitBadge: {
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  waitBadgeText: { fontSize: 11, fontWeight: '700', color: '#3730A3' },
  cardTime: { fontSize: 11, color: '#9CA3AF' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },

  helperProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  helperAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  helperAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  helperInfo: { flex: 1, gap: 2 },
  helperName: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  helperUniv: { fontSize: 12, color: '#9CA3AF' },
  helperStats: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  acceptBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  btnDisabled: { opacity: 0.6 },

  enterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  enterHint: { fontSize: 12, color: '#9CA3AF' },

  // 채팅 목록 행 (IN_PROGRESS)
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF',
  },
  roomBody: { flex: 1, gap: 3 },
  roomTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partnerName: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  time: { fontSize: 12, color: '#9CA3AF' },
  requestLabel: {
    fontSize: 11, color: PRIMARY, fontWeight: '600',
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5,
    alignSelf: 'flex-start',
  },
  lastMessage: { fontSize: 13, color: '#6B7280' },
});
