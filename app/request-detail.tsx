// 도움 요청 상세 화면
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, CategoryLabels, MethodLabels, StatusLabels } from '../constants/colors';
import { MOCK_REQUESTS } from '../constants/mockData';
import { useAuthStore } from '../stores/authStore';
import type { HelpCategory, HelpMethod, RequestStatus } from '../types';

// 카테고리별 스타일
const CATEGORY_EMOJI: Record<HelpCategory, string> = {
  BANK: '🏦', HOSPITAL: '🏥', SCHOOL: '🏫', DAILY: '🏠', OTHER: '📌',
};
const CATEGORY_BG: Record<HelpCategory, string> = {
  BANK: '#FEF3C7', HOSPITAL: '#FEE2E2', SCHOOL: '#EDE9FE', DAILY: '#D1FAE5', OTHER: '#F3F4F6',
};

// 도움 방식 아이콘
const METHOD_ICON: Record<HelpMethod, string> = {
  CHAT: 'chatbubble-outline',
  VIDEO_CALL: 'videocam-outline',
  OFFLINE: 'walk-outline',
};

// 상태별 색상
const STATUS_COLOR: Record<RequestStatus, string> = {
  WAITING: Colors.warning,
  MATCHED: Colors.info,
  IN_PROGRESS: Colors.primary,
  COMPLETED: Colors.success,
  CANCELLED: Colors.error,
};

function formatTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  // 목업 데이터에서 찾기 (백엔드 연결 후 API 호출로 교체)
  const item = MOCK_REQUESTS.find((r) => r.id === Number(id));

  if (!item) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>게시글을 찾을 수 없습니다.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorBack}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isMyPost = user?.id === item.requester.id;
  const canHelp = !isMyPost && item.status === 'WAITING' && user?.userType === 'KOREAN';

  const handleHelp = () => {
    Alert.alert(
      '도움 신청',
      `${item.requester.nickname}님의 요청에 도움을 드릴까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '도움 드릴게요!',
          onPress: () => {
            // TODO: acceptHelpRequest API 연결
            Alert.alert('신청 완료', '도움 신청이 완료됐어요! 상대방이 수락하면 채팅이 시작됩니다.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>도움 요청</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 카테고리 썸네일 */}
        <View style={[styles.thumbnail, { backgroundColor: CATEGORY_BG[item.category] }]}>
          <Text style={styles.thumbnailEmoji}>{CATEGORY_EMOJI[item.category]}</Text>
        </View>

        <View style={styles.content}>

          {/* 카테고리 + 상태 뱃지 */}
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{CategoryLabels[item.category]}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
              <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[item.status] }]}>
                {StatusLabels[item.status]}
              </Text>
            </View>
          </View>

          {/* 제목 */}
          <Text style={styles.title}>{item.title}</Text>

          {/* 작성 시간 */}
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>

          <View style={styles.divider} />

          {/* 요청자 정보 */}
          <View style={styles.requesterSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.requester.nickname.charAt(0)}
              </Text>
            </View>
            <View style={styles.requesterInfo}>
              <Text style={styles.requesterName}>{item.requester.nickname}</Text>
              <Text style={styles.requesterUniv}>{item.requester.university}</Text>
            </View>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{item.requester.rating.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* 본문 */}
          <Text style={styles.sectionLabel}>상세 내용</Text>
          <Text style={styles.description}>{item.description}</Text>

          <View style={styles.divider} />

          {/* 도움 방식 */}
          <Text style={styles.sectionLabel}>도움 방식</Text>
          <View style={styles.methodBox}>
            <Ionicons
              name={METHOD_ICON[item.helpMethod] as 'chatbubble-outline'}
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.methodText}>{MethodLabels[item.helpMethod]}</Text>
            <Text style={styles.methodDesc}>
              {item.helpMethod === 'CHAT' && '채팅으로 소통합니다'}
              {item.helpMethod === 'VIDEO_CALL' && '영상통화로 진행합니다'}
              {item.helpMethod === 'OFFLINE' && '직접 만나서 도와드립니다'}
            </Text>
          </View>

        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* 하단 액션 버튼 */}
      <View style={styles.footer}>
        {isMyPost ? (
          <View style={styles.myPostNote}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textLight} />
            <Text style={styles.myPostNoteText}>내가 작성한 요청입니다</Text>
          </View>
        ) : item.status !== 'WAITING' ? (
          <View style={styles.closedNote}>
            <Text style={styles.closedNoteText}>
              {item.status === 'MATCHED' ? '이미 매칭된 요청입니다' : StatusLabels[item.status]}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.helpBtn, !canHelp && styles.helpBtnDisabled]}
            onPress={canHelp ? handleHelp : undefined}
          >
            <Ionicons name="hand-left-outline" size={20} color={Colors.textWhite} />
            <Text style={styles.helpBtnText}>
              {user?.userType === 'INTERNATIONAL' ? '내 요청이에요' : '도움 드릴게요!'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorBack: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '700',
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  scroll: { flex: 1 },

  // 상단 썸네일
  thumbnail: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailEmoji: {
    fontSize: 72,
  },

  content: {
    padding: 20,
    gap: 12,
  },

  // 뱃지
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // 제목
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  time: {
    fontSize: 13,
    color: Colors.textLight,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 4,
  },

  // 요청자
  requesterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  requesterInfo: {
    flex: 1,
    gap: 2,
  },
  requesterName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  requesterUniv: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // 본문
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  description: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 24,
  },

  // 도움 방식
  methodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: 12,
  },
  methodText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  methodDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 'auto',
  },

  bottomPadding: { height: 20 },

  // 하단 버튼
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  helpBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  helpBtnDisabled: {
    backgroundColor: Colors.border,
  },
  helpBtnText: {
    color: Colors.textWhite,
    fontSize: 17,
    fontWeight: '700',
  },
  myPostNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  myPostNoteText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  closedNote: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  closedNoteText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
