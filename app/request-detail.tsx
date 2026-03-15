// 도움 요청 상세 화면 (리디자인)
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
import { CategoryLabels } from '../constants/colors';
import { MOCK_REQUESTS } from '../constants/mockData';
import { useAuthStore } from '../stores/authStore';
import type { HelpCategory, HelpMethod } from '../types';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';

const CATEGORY_EMOJI: Record<HelpCategory, string> = {
  BANK: '🏦', HOSPITAL: '🏥', SCHOOL: '🏫', DAILY: '🏠', OTHER: '📌',
};
const CATEGORY_BG: Record<HelpCategory, string> = {
  BANK: '#FEF3C7', HOSPITAL: '#FEE2E2', SCHOOL: '#EDE9FE', DAILY: '#D1FAE5', OTHER: '#F3F4F6',
};

const METHOD_LABEL: Record<HelpMethod, string> = {
  CHAT: '채팅',
  VIDEO_CALL: '영상통화',
  OFFLINE: '오프라인 대면',
};
const METHOD_DOT: Record<HelpMethod, string> = {
  CHAT: PRIMARY,
  VIDEO_CALL: '#7C3AED',
  OFFLINE: '#D97706',
};

// 목업 헬퍼 데이터 (백엔드 연결 전)
const MOCK_HELPERS = [
  { id: 10, name: '김민준', detail: '경영학과 3학년 · 도움 12회', rating: 4.9, recommended: true, initial: '김' },
  { id: 11, name: '이서연', detail: '국어국문 2학년 · 도움 5회', rating: 4.6, recommended: false, initial: '이' },
];

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
  const isUrgent = item.id === 1; // 첫 번째 항목 긴급 표시 (임시)

  const handleHelp = () => {
    Alert.alert(
      '도움 신청',
      `${item.requester.nickname}님의 요청에 도움을 드릴까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '도와드릴게요!',
          onPress: () => {
            Alert.alert('신청 완료', '도움 신청이 완료됐어요! 상대방이 수락하면 채팅이 시작됩니다.');
          },
        },
      ]
    );
  };

  const allMethods: HelpMethod[] = ['OFFLINE', 'CHAT', 'VIDEO_CALL'];

  return (
    <View style={styles.container}>
      {/* 상단 네비 */}
      <View style={styles.topnav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>도움 요청 상세</Text>
        <TouchableOpacity style={styles.navBtn}>
          <Ionicons name="share-social-outline" size={17} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 히어로 섹션 */}
        <View style={styles.hero}>
          {/* 아이콘 + 태그 */}
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: CATEGORY_BG[item.category] }]}>
              <Text style={styles.heroIconEmoji}>{CATEGORY_EMOJI[item.category]}</Text>
            </View>
            <View style={styles.heroMeta}>
              <View style={styles.heroTags}>
                <View style={styles.tagCat}>
                  <Text style={styles.tagCatText}>{CategoryLabels[item.category].replace(/\S+\s/, '')}</Text>
                </View>
                {isUrgent && (
                  <View style={styles.tagUrgent}>
                    <Text style={styles.tagUrgentText}>긴급</Text>
                  </View>
                )}
                <View style={item.status === 'MATCHED' ? styles.tagMatched : styles.tagOpen}>
                  <Text style={item.status === 'MATCHED' ? styles.tagMatchedText : styles.tagOpenText}>
                    {item.status === 'MATCHED' ? '매칭됨' : '모집중'}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroSub}>{item.requester.university} · {formatTime(item.createdAt)}</Text>
            </View>
          </View>

          {/* 제목 */}
          <Text style={styles.heroTitle}>{item.title}</Text>

          {/* 작성자 */}
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.requester.nickname.charAt(0)}</Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{item.requester.nickname}</Text>
              <Text style={styles.authorSub}>{item.requester.university}</Text>
            </View>
            {item.requester.helpCount === 0 && (
              <Text style={styles.firstBadge}>첫 요청</Text>
            )}
          </View>

          {/* 본문 */}
          <Text style={styles.bodyText}>{item.description}</Text>
        </View>

        {/* 정보 카드 섹션 */}
        <View style={styles.infoSection}>

          {/* 요청 정보 */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>요청 정보</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}><Text style={styles.infoIcon}>📅</Text> 희망 일정</Text>
              <Text style={styles.infoValue}>이번 주 내</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}><Text style={styles.infoIcon}>⏱</Text> 소요 시간</Text>
              <Text style={styles.infoValue}>1~2시간 이내</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}><Text style={styles.infoIcon}>📍</Text> 장소</Text>
              <Text style={styles.infoValue}>국민대 근처</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}><Text style={styles.infoIcon}>🌐</Text> 언어</Text>
              <Text style={styles.infoValue}>한국어·영어</Text>
            </View>
          </View>

          {/* 소통 방식 */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>원하는 소통 방식</Text>
            <View style={styles.methodRow}>
              {allMethods.map((m) => {
                const isSelected = m === item.helpMethod;
                return (
                  <View
                    key={m}
                    style={[styles.methodChip, isSelected ? styles.methodChipSelected : styles.methodChipUnselected]}
                  >
                    <View style={[styles.methodDot, { backgroundColor: isSelected ? METHOD_DOT[m] : '#D1D5DB' }]} />
                    <Text style={[styles.methodChipText, isSelected ? styles.methodChipTextSelected : styles.methodChipTextUnselected]}>
                      {METHOD_LABEL[m]}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* 지도 플레이스홀더 */}
            {item.helpMethod === 'OFFLINE' && (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPin}>📍</Text>
                <Text style={styles.mapLabel}>신한은행 국민대입구점</Text>
                <Text style={styles.mapSub}>서울 성북구 정릉로 77</Text>
              </View>
            )}
          </View>

          {/* 도움 신청한 학생 */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>
              도움 신청한 학생{' '}
              <Text style={styles.helperCount}>{MOCK_HELPERS.length}명</Text>
            </Text>
            {MOCK_HELPERS.map((helper, idx) => (
              <View key={helper.id} style={[styles.helperItem, idx > 0 && styles.helperItemBorder]}>
                <View style={[styles.helperAvatar, idx === 0 ? styles.helperAvatarGreen : styles.helperAvatarPurple]}>
                  <Text style={styles.helperAvatarText}>{helper.initial}</Text>
                  {idx === 0 && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.helperInfo}>
                  <Text style={styles.helperName}>{helper.name}</Text>
                  <Text style={styles.helperDetail}>{helper.detail}</Text>
                  <Text style={styles.helperRating}>
                    {'★★★★★'} <Text style={styles.helperRatingNum}>{helper.rating.toFixed(1)}</Text>
                  </Text>
                </View>
                {helper.recommended && (
                  <View style={styles.recommendBadge}>
                    <Text style={styles.recommendBadgeText}>추천</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* 하단 CTA */}
      <View style={styles.cta}>
        <TouchableOpacity style={styles.bookmarkBtn}>
          <Ionicons name="bookmark-outline" size={20} color={PRIMARY} />
        </TouchableOpacity>
        {isMyPost ? (
          <View style={styles.myPostNote}>
            <Text style={styles.myPostNoteText}>내가 작성한 요청입니다</Text>
          </View>
        ) : item.status !== 'WAITING' ? (
          <View style={styles.closedBtn}>
            <Text style={styles.closedBtnText}>이미 매칭된 요청입니다</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.helpBtn, !canHelp && styles.helpBtnDisabled]}
            onPress={canHelp ? handleHelp : undefined}
            activeOpacity={0.88}
          >
            <Text style={styles.helpBtnText}>
              {user?.userType === 'INTERNATIONAL' ? '내 요청이에요' : '🤝 도와드릴게요!'}
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
    backgroundColor: '#F3F4F8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F8',
  },
  errorText: { fontSize: 16, color: '#6B7280' },
  errorBack: { fontSize: 15, color: PRIMARY, fontWeight: '700' },

  // 상단 네비
  topnav: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79,70,229,0.1)',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
    letterSpacing: -0.3,
  },

  scroll: { flex: 1 },

  // 히어로
  hero: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 10,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  heroIconEmoji: { fontSize: 30 },
  heroMeta: { flex: 1 },
  heroTags: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 7,
    flexWrap: 'wrap',
  },
  tagCat: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagCatText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  tagUrgent: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagUrgentText: { fontSize: 11, fontWeight: '600', color: '#991B1B' },
  tagOpen: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagOpenText: { fontSize: 11, fontWeight: '600', color: '#065F46' },
  tagMatched: { backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagMatchedText: { fontSize: 11, fontWeight: '600', color: '#3730A3' },
  heroSub: { fontSize: 11, color: '#9CA3AF' },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1B4B',
    letterSpacing: -0.5,
    lineHeight: 26,
    marginBottom: 14,
  },

  // 작성자
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(79,70,229,0.1)',
    marginBottom: 14,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 13, fontWeight: '700', color: '#1E1B4B' },
  authorSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  firstBadge: { fontSize: 11, color: '#9CA3AF' },

  // 본문
  bodyText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 24,
  },

  // 정보 섹션
  infoSection: {
    padding: 14,
    gap: 10,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.06)',
  },
  infoCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(79,70,229,0.08)',
  },
  infoRowLast: {},
  infoLabel: { fontSize: 13, color: '#9CA3AF' },
  infoIcon: { fontSize: 15 },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1E1B4B' },

  // 소통 방식
  methodRow: {
    flexDirection: 'row',
    gap: 7,
    flexWrap: 'wrap',
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  methodChipSelected: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: PRIMARY,
  },
  methodChipUnselected: {
    backgroundColor: '#F3F4F8',
    borderColor: 'rgba(79,70,229,0.1)',
  },
  methodDot: { width: 7, height: 7, borderRadius: 4 },
  methodChipText: { fontSize: 12, fontWeight: '600' },
  methodChipTextSelected: { color: PRIMARY },
  methodChipTextUnselected: { color: '#9CA3AF' },

  // 지도 플레이스홀더
  mapPlaceholder: {
    marginTop: 10,
    borderRadius: 12,
    height: 100,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.12)',
  },
  mapPin: { fontSize: 22 },
  mapLabel: { fontSize: 12, fontWeight: '600', color: PRIMARY },
  mapSub: { fontSize: 11, color: '#818CF8' },

  // 헬퍼
  helperCount: { color: PRIMARY, fontWeight: '700' },
  helperItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  helperItemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(79,70,229,0.08)',
  },
  helperAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  helperAvatarGreen: { backgroundColor: '#059669' },
  helperAvatarPurple: { backgroundColor: '#6366F1' },
  helperAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  helperInfo: { flex: 1 },
  helperName: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  helperDetail: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  helperRating: { fontSize: 12, color: '#F59E0B', marginTop: 2 },
  helperRatingNum: { color: '#6B7280', fontWeight: '600' },
  recommendBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendBadgeText: { fontSize: 11, fontWeight: '700', color: '#065F46' },

  bottomPadding: { height: 20 },

  // CTA
  cta: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(79,70,229,0.1)',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  bookmarkBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  helpBtn: {
    flex: 1,
    height: 48,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 6,
  },
  helpBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  helpBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  myPostNote: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myPostNoteText: { fontSize: 14, color: '#9CA3AF' },
  closedBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedBtnText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
});
