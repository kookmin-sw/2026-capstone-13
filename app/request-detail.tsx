// 도움 요청 상세 화면 (홈화면 무드 통일 리디자인)
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CategoryLabels } from '../constants/colors';
import { getHelpRequestById, acceptHelpRequest, cancelHelpRequest } from '../services/helpService';
import { useAuthStore } from '../stores/authStore';
import type { HelpCategory, HelpMethod, HelpRequest } from '../types';

// ── Design tokens (홈화면과 통일) ──────────────────────────────
const BLUE    = '#3B6FE8';
const BLUE_L  = '#EEF4FF';
const T1      = '#0C1C3C';
const T2      = '#AABBCC';
const BG      = '#F0F4FA';
const DIV     = 'rgba(59,111,232,0.10)';

const SERVER_BASE_URL = 'https://backend-production-0a6f.up.railway.app';

function toAbsoluteUrl(path?: string): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return SERVER_BASE_URL + path;
}

const CATEGORY_EMOJI: Record<HelpCategory, string> = {
  BANK: '🏦', HOSPITAL: '🏥', SCHOOL: '🏫', DAILY: '🏠', OTHER: '📌',
};
const CATEGORY_BG: Record<HelpCategory, string> = {
  BANK: '#FEF3C7', HOSPITAL: '#FEE2E2', SCHOOL: '#EDE9FE', DAILY: '#D1FAE5', OTHER: '#F3F4F6',
};
const CATEGORY_COLOR: Record<HelpCategory, string> = {
  BANK: '#D97706', HOSPITAL: '#DC2626', SCHOOL: '#7C3AED', DAILY: '#059669', OTHER: '#6B7280',
};

const METHOD_LABEL: Record<HelpMethod, string> = {
  CHAT: '채팅',
  VIDEO_CALL: '영상통화',
  OFFLINE: '오프라인 대면',
};
const METHOD_DOT: Record<HelpMethod, string> = {
  CHAT: BLUE,
  VIDEO_CALL: '#7C3AED',
  OFFLINE: '#D97706',
};

function parseDescription(raw: string) {
  const parts = raw.split('\n\n[정보]\n');
  if (parts.length === 2) {
    const meta: Record<string, string> = {};
    parts[1].split('\n').forEach((line) => {
      const idx = line.indexOf(':');
      if (idx !== -1) meta[line.slice(0, idx)] = line.slice(idx + 1);
    });
    return { body: parts[0], meta };
  }
  return { body: raw, meta: {} };
}

function formatTime(createdAt: string): string {
  const date = new Date(createdAt.includes('Z') || createdAt.includes('+') ? createdAt : createdAt + 'Z');
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

const STATUS_LABEL: Record<string, string> = {
  WAITING:     '모집중',
  MATCHED:     '대기중',
  IN_PROGRESS: '진행중',
  COMPLETED:   '모집완료',
};
const STATUS_BG: Record<string, string> = {
  WAITING:     '#D1FAE5',
  MATCHED:     BLUE_L,
  IN_PROGRESS: '#FFF3E8',
  COMPLETED:   '#F3F4F6',
};
const STATUS_COLOR: Record<string, string> = {
  WAITING:     '#065F46',
  MATCHED:     '#3730A3',
  IN_PROGRESS: '#C45A10',
  COMPLETED:   '#6B7280',
};

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [item, setItem] = useState<HelpRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await getHelpRequestById(Number(id));
        if (response.success) setItem(response.data);
      } catch {
        Alert.alert('오류', '게시글을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

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

  const { body, meta } = parseDescription(item.description);
  const isMyPost = user?.id === item.requester.id;
  const isHelper = user?.id === item.helper?.id;
  const isInChat = item.status === 'MATCHED' && (isMyPost || isHelper);
  const canHelp  = !isMyPost && item.status === 'WAITING' && user?.userType === 'KOREAN';

  const profileUri = toAbsoluteUrl(item.requester.profileImage);
  const showHeroImg = !!profileUri && !imgError;
  const initial = item.requester.nickname.charAt(0);
  const isVerified = item.requester.studentIdVerified || item.requester.studentIdStatus === 'APPROVED';
  const allMethods: HelpMethod[] = ['OFFLINE', 'CHAT', 'VIDEO_CALL'];

  const handleDelete = () => {
    Alert.alert('글 삭제', '도움 요청을 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await cancelHelpRequest(item.id);
            if (response.success) {
              Alert.alert('삭제 완료', '도움 요청이 삭제됐습니다.', [
                { text: '확인', onPress: () => router.back() },
              ]);
            } else {
              Alert.alert('실패', response.message);
            }
          } catch {
            Alert.alert('오류', '서버 오류가 발생했습니다.');
          }
        },
      },
    ]);
  };

  const handleEdit = () => {
    router.push({
      pathname: '/(main)/write',
      params: {
        editId: item.id,
        editTitle: item.title,
        editDescription: body,
        editCategory: item.category,
        editMethod: item.helpMethod,
        editSchedule: meta['희망일정'] ?? '',
        editDuration: meta['소요시간'] ?? '',
        editLanguage: meta['언어'] ?? '',
        editLocation: meta['장소'] ?? '',
      },
    });
  };

  const goToChatRoom = () => {
    router.push({
      pathname: '/chatroom',
      params: {
        roomId: item.id,
        requestTitle: item.title,
        partnerNickname: user?.userType === 'KOREAN'
          ? item.requester.nickname
          : (item.helper?.nickname ?? ''),
        requestStatus: item.status,
        requesterId: item.requester.id,
      },
    });
  };

  const handleHelp = () => {
    Alert.alert(
      '도움 신청',
      `${item.requester.nickname}님의 요청에 도움을 드릴까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '도와드릴게요!',
          onPress: async () => {
            setIsAccepting(true);
            try {
              const response = await acceptHelpRequest(item.id);
              if (response.success) {
                router.replace({
                  pathname: '/chatroom',
                  params: {
                    roomId: item.id,
                    requestTitle: item.title,
                    partnerNickname: item.requester.nickname,
                    requestStatus: 'MATCHED',
                    requesterId: item.requester.id,
                  },
                });
              } else {
                Alert.alert('실패', response.message);
              }
            } catch {
              Alert.alert('오류', '서버 오류가 발생했습니다.');
            } finally {
              setIsAccepting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 상단 네비 ── */}
        <View style={styles.topnav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={BLUE} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>도움 요청 상세</Text>
          <TouchableOpacity style={styles.navBtn}>
            <Ionicons name="share-social-outline" size={18} color={BLUE} />
          </TouchableOpacity>
        </View>

        {/* ── 히어로 카드 (원형 프로필 + 우측 정보) ── */}
        <View style={styles.heroCard}>
          {/* 원형 프로필 */}
          <View style={styles.avatarWrap}>
            {showHeroImg ? (
              <Image
                source={{ uri: profileUri! }}
                style={styles.avatarImg}
                onError={() => setImgError(true)}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#22c55e" />
              </View>
            )}
          </View>

          {/* 우측 정보 */}
          <View style={styles.heroInfo}>
            {/* 뱃지 */}
            <View style={styles.heroTags}>
              <View style={[styles.heroBadge, { backgroundColor: CATEGORY_BG[item.category] }]}>
                <Text style={[styles.heroBadgeText, { color: CATEGORY_COLOR[item.category] }]}>
                  {CATEGORY_EMOJI[item.category]} {CategoryLabels[item.category].replace(/\S+\s/, '')}
                </Text>
              </View>
              <View style={[styles.heroBadge, { backgroundColor: STATUS_BG[item.status] ?? '#F3F4F6' }]}>
                <Text style={[styles.heroBadgeText, { color: STATUS_COLOR[item.status] ?? '#6B7280' }]}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Text>
              </View>
            </View>

            {/* 이름 */}
            <Text style={styles.heroName}>{item.requester.nickname}</Text>

            {/* 학과 */}
            {item.requester.major && (
              <View style={styles.heroMetaItem}>
                <Ionicons name="school-outline" size={13} color={T2} />
                <Text style={styles.heroMetaText}>{item.requester.major}</Text>
              </View>
            )}

            {/* 시간 */}
            <View style={styles.heroMetaItem}>
              <Ionicons name="time-outline" size={13} color={T2} />
              <Text style={styles.heroMetaText}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* 제목 + 본문 */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.titleText}>{item.title}</Text>
            <Text style={styles.bodyText}>{body}</Text>
          </View>
        </View>

        {/* ── 요청 정보 카드 ── */}
        {(meta['희망일정'] || meta['소요시간'] || meta['장소'] || meta['언어']) && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>요청 정보</Text>
              {meta['희망일정'] && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>📅 희망 일정</Text>
                  <Text style={styles.infoValue}>{meta['희망일정']}</Text>
                </View>
              )}
              {meta['소요시간'] && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>⏱ 소요 시간</Text>
                  <Text style={styles.infoValue}>{meta['소요시간']}</Text>
                </View>
              )}
              {meta['장소'] && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>📍 장소</Text>
                  <Text style={styles.infoValue}>{meta['장소']}</Text>
                </View>
              )}
              {meta['언어'] && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>🌐 언어</Text>
                  <Text style={styles.infoValue}>{meta['언어']}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── 소통 방식 카드 ── */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>원하는 소통 방식</Text>
            <View style={styles.methodRow}>
              {allMethods.map((m) => {
                const isSelected = m === item.helpMethod;
                return (
                  <View
                    key={m}
                    style={[
                      styles.methodChip,
                      isSelected ? styles.methodChipSelected : styles.methodChipUnselected,
                    ]}
                  >
                    <View style={[styles.methodDot, { backgroundColor: isSelected ? METHOD_DOT[m] : '#D1D5DB' }]} />
                    <Text style={[styles.methodChipText, isSelected ? styles.methodChipTextOn : styles.methodChipTextOff]}>
                      {METHOD_LABEL[m]}
                    </Text>
                  </View>
                );
              })}
            </View>

            {item.helpMethod === 'OFFLINE' && (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPin}>📍</Text>
                <Text style={styles.mapLabel}>신한은행 국민대입구점</Text>
                <Text style={styles.mapSub}>서울 성북구 정릉로 77</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── 매칭된 헬퍼 ── */}
        {item.helper && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>도움을 주는 학생</Text>
              <View style={styles.helperItem}>
                {toAbsoluteUrl(item.helper.profileImage) ? (
                  <Image
                    source={{ uri: toAbsoluteUrl(item.helper.profileImage)! }}
                    style={styles.helperAvatar}
                  />
                ) : (
                  <View style={[styles.helperAvatar, styles.helperAvatarFallback]}>
                    <Text style={styles.helperAvatarText}>{item.helper.nickname.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.helperInfo}>
                  <Text style={styles.helperName}>{item.helper.nickname}</Text>
                  <Text style={styles.helperDetail}>
                    {item.helper.university} · 도움 {item.helper.helpCount}회
                  </Text>
                  <Text style={styles.helperRating}>
                    {'★★★★★'}{' '}
                    <Text style={styles.helperRatingNum}>{item.helper.rating.toFixed(1)}</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* ── 하단 CTA ── */}
      <View style={styles.cta}>
        <TouchableOpacity style={styles.bookmarkBtn}>
          <Ionicons name="bookmark-outline" size={20} color={BLUE} />
        </TouchableOpacity>
        {isInChat ? (
          <TouchableOpacity style={styles.helpBtn} onPress={goToChatRoom}>
            <Text style={styles.helpBtnText}>💬 채팅방으로 이동</Text>
          </TouchableOpacity>
        ) : isMyPost && item.status === 'WAITING' ? (
          <View style={styles.myPostActions}>
            <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
              <Text style={styles.editBtnText}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>삭제</Text>
            </TouchableOpacity>
          </View>
        ) : isMyPost ? (
          <View style={styles.closedBtn}>
            <Text style={styles.closedBtnText}>매칭 후 수정·삭제 불가</Text>
          </View>
        ) : item.status !== 'WAITING' ? (
          <View style={styles.closedBtn}>
            <Text style={styles.closedBtnText}>이미 매칭된 요청입니다</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.helpBtn, (!canHelp || isAccepting) && styles.helpBtnDisabled]}
            onPress={canHelp && !isAccepting ? handleHelp : undefined}
            activeOpacity={0.88}
          >
            {isAccepting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.helpBtnText}>
                {user?.userType !== 'KOREAN' ? '내 요청이에요' : '🤝 도와드릴게요!'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BG,
  },
  errorText: { fontSize: 16, color: T2 },
  errorBack: { fontSize: 15, color: BLUE, fontWeight: '700' },

  scroll: { flex: 1 },

  // ── 상단 네비 ───────────────────────────────────────────
  topnav: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: DIV,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: BLUE_L,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: T1,
    letterSpacing: -0.3,
  },

  // ── 히어로 카드 ─────────────────────────────────────────
  heroCard: {
    marginHorizontal: 18,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  // 원형 프로필
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: BLUE_L,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C7DCF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: BLUE_L,
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: '900',
    color: BLUE,
    opacity: 0.7,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },

  // 우측 정보
  heroInfo: {
    flex: 1,
    gap: 5,
  },
  heroTags: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  heroBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '900',
    color: T1,
    letterSpacing: -0.3,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    fontSize: 13,
    color: T2,
    fontWeight: '600',
  },

  titleText: {
    fontSize: 20,
    fontWeight: '900',
    color: T1,
    letterSpacing: -0.4,
    lineHeight: 28,
  },

  // ── 섹션 / 카드 ──────────────────────────────────────────
  section: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: DIV,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: T2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // 본문
  bodyText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 24,
  },

  // 요청 정보 행
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: DIV,
  },
  infoLabel: { fontSize: 13, color: T2 },
  infoValue: { fontSize: 13, fontWeight: '600', color: T1 },

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
    backgroundColor: BLUE_L,
    borderColor: BLUE,
  },
  methodChipUnselected: {
    backgroundColor: '#F3F4F8',
    borderColor: DIV,
  },
  methodDot: { width: 7, height: 7, borderRadius: 4 },
  methodChipText: { fontSize: 12, fontWeight: '600' },
  methodChipTextOn:  { color: BLUE },
  methodChipTextOff: { color: T2 },

  // 지도 플레이스홀더
  mapPlaceholder: {
    marginTop: 10,
    borderRadius: 12,
    height: 100,
    backgroundColor: BLUE_L,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: DIV,
  },
  mapPin: { fontSize: 22 },
  mapLabel: { fontSize: 12, fontWeight: '600', color: BLUE },
  mapSub: { fontSize: 11, color: T2 },

  // 헬퍼
  helperItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  helperAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    flexShrink: 0,
  },
  helperAvatarFallback: {
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperAvatarText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  helperInfo: { flex: 1 },
  helperName: { fontSize: 14, fontWeight: '700', color: T1 },
  helperDetail: { fontSize: 11, color: T2, marginTop: 2 },
  helperRating: { fontSize: 12, color: '#F59E0B', marginTop: 2 },
  helperRatingNum: { color: T2, fontWeight: '600' },

  bottomPadding: { height: 20 },

  // ── 하단 CTA ─────────────────────────────────────────────
  cta: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: DIV,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  bookmarkBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: BLUE_L,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  helpBtn: {
    flex: 1,
    height: 48,
    backgroundColor: BLUE,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BLUE,
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
  myPostActions: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: BLUE,
  },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  closedBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedBtnText: { fontSize: 14, color: T2, fontWeight: '600' },
});
