// 도움 요청 상세 화면 (홈화면 무드 통일 리디자인)
import { useState, useEffect } from 'react';
import { getInitial } from '../utils/getInitial';
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
import { s } from '../utils/scale';
import { CategoryLabels } from '../constants/colors';
import { getHelpRequestById, acceptHelpRequest, cancelHelpRequest } from '../services/helpService';
import { useAuthStore } from '../stores/authStore';
import type { HelpCategory, HelpMethod, HelpRequest } from '../types';

// ── Design tokens (홈화면과 완전 통일) ──
const BLUE    = '#3B6FE8';
const BLUE_L  = '#EEF4FF';
const ORANGE  = '#F97316';
const T1      = '#0C1C3C';
const T2      = '#AABBCC';
const BG      = '#F0F4FA';
const DIV     = '#D4E4FF';

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
  const initial = getInitial(item.requester.nickname);
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
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 60 : 36 }}>


        {/* ── 히어로 카드 ── */}
        <View style={styles.heroCard}>
          {/* 프로필 + 이름 */}
          <View style={styles.heroProfileRow}>
            <TouchableOpacity
              style={styles.avatarWrap}
              activeOpacity={0.85}
              onPress={() => !isMyPost && item.requester.id && item.requester.nickname !== '(알 수 없음)' && router.push({ pathname: '/user-profile', params: { id: item.requester.id } })}
            >
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
            </TouchableOpacity>
            <View style={styles.heroNameWrap}>
              <View style={styles.heroNameTopRow}>
                <TouchableOpacity
                  activeOpacity={!isMyPost && item.requester.id && item.requester.nickname !== '(알 수 없음)' ? 0.7 : 1}
                  onPress={() => !isMyPost && item.requester.id && item.requester.nickname !== '(알 수 없음)' && router.push({ pathname: '/user-profile', params: { id: item.requester.id } })}
                >
                  <Text style={styles.heroName}>{item.requester.nickname}</Text>
                </TouchableOpacity>
                <View style={styles.heroBadgeRow}>
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
              </View>
              {item.requester.major && (
                <Text style={styles.heroMetaText}>{item.requester.major}</Text>
              )}
              <Text style={styles.heroMetaText}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* ── 제목 + 본문 카드 ── */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <Text style={styles.titleText}>{item.title}</Text>
            <View style={styles.divider} />
            <Text style={styles.bodyText}>{body}</Text>
            {meta['사진'] && (
              <View style={styles.photoRow}>
                {meta['사진'].split(',').map((uri, idx) => (
                  <Image key={idx} source={{ uri: uri.trim() }} style={styles.photoThumb} />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── 소통 방식 카드 ── */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <View style={styles.methodTitleRow}>
              <Text style={styles.sectionTitle}>매칭 방식</Text>
              <View style={styles.methodRow}>
                {(['ONLINE', 'OFFLINE'] as const).map((m) => {
                  const isSelected = m === 'OFFLINE' ? item.helpMethod === 'OFFLINE' : item.helpMethod !== 'OFFLINE';
                  const color = m === 'OFFLINE' ? ORANGE : BLUE;
                  const label = m === 'OFFLINE' ? '오프라인' : '온라인';
                  return (
                    <View
                      key={m}
                      style={[
                        styles.methodChip,
                        isSelected
                          ? { ...styles.methodChipSelected, borderColor: color, backgroundColor: m === 'OFFLINE' ? '#FFF3E0' : BLUE_L }
                          : styles.methodChipUnselected,
                      ]}
                    >
                      <View style={[styles.methodDot, { backgroundColor: isSelected ? color : '#D1D5DB' }]} />
                      <Text style={[styles.methodChipText, isSelected ? { color } : styles.methodChipTextOff]}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* ── 요청 정보 카드 ── */}
        {(meta['희망일정'] || meta['소요시간'] || meta['장소'] || meta['언어']) && (
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, { marginBottom: s(12) }]}>요청 정보</Text>
              {meta['희망일정'] && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>희망 일정</Text>
                  <Text style={styles.infoValue}>{meta['희망일정']}</Text>
                </View>
              )}
              {meta['소요시간'] && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>소요 시간</Text>
                  <Text style={styles.infoValue}>{meta['소요시간']}</Text>
                </View>
              )}
              {meta['장소'] && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>장소</Text>
                  <Text style={styles.infoValue}>{meta['장소']}</Text>
                </View>
              )}
              {meta['언어'] && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>언어</Text>
                  <Text style={styles.infoValue}>{meta['언어']}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── 매칭된 헬퍼 ── */}
        {item.helper && (
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="person-outline" size={16} color="#059669" />
                </View>
                <Text style={styles.sectionTitle}>도움을 주는 학생</Text>
              </View>
              <View style={styles.helperItem}>
                {toAbsoluteUrl(item.helper.profileImage) ? (
                  <Image
                    source={{ uri: toAbsoluteUrl(item.helper.profileImage)! }}
                    style={styles.helperAvatar}
                  />
                ) : (
                  <View style={[styles.helperAvatar, styles.helperAvatarFallback]}>
                    <Text style={styles.helperAvatarText}>{getInitial(item.helper.nickname)}</Text>
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
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={BLUE} />
        </TouchableOpacity>
        {isInChat ? (
          <TouchableOpacity style={styles.helpBtn} onPress={goToChatRoom}>
            <Ionicons name="chatbubble-outline" size={16} color="#fff" />
            <Text style={styles.helpBtnText}>채팅방으로 이동</Text>
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
                {user?.userType !== 'KOREAN' ? '내 요청이에요' : '도와드릴게요!'}
              </Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.navBtn}>
          <Ionicons name="ellipsis-vertical" size={18} color={BLUE} />
        </TouchableOpacity>
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
    gap: s(12),
    backgroundColor: BG,
  },
  errorText: { fontSize: s(16), color: T2 },
  errorBack: { fontSize: s(15), color: BLUE, fontWeight: '700' },

  scroll: { flex: 1 },

  // ── 상단 네비 ──
  topnav: {
    paddingTop: Platform.OS === 'ios' ? 110 : s(70),
    paddingBottom: s(8),
    paddingHorizontal: s(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(10),
    backgroundColor: BLUE_L,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── 히어로 카드 ──
  heroCard: {
    marginHorizontal: s(16),
    marginTop: s(14),
    marginBottom: s(4),
    backgroundColor: '#fff',
    borderRadius: s(20),
    padding: s(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.12,
    shadowRadius: s(12),
    elevation: 6,
  },
  heroNameTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(6),
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  heroBadge: {
    paddingHorizontal: s(10),
    paddingVertical: s(4),
    borderRadius: s(20),
  },
  heroBadgeText: {
    fontSize: s(12),
    fontWeight: '700',
  },
  heroProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  avatarImg: {
    width: s(88),
    height: s(88),
    borderRadius: s(44),
    borderWidth: s(2.5),
    borderColor: BLUE_L,
  },
  avatarFallback: {
    width: s(88),
    height: s(88),
    borderRadius: s(44),
    backgroundColor: '#C7DCF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: s(2.5),
    borderColor: BLUE_L,
  },
  avatarInitial: {
    fontSize: s(34),
    fontWeight: '900',
    color: BLUE,
    opacity: 0.7,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: s(20),
    height: s(20),
    borderRadius: s(10),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: s(1) },
    shadowOpacity: 0.12,
    shadowRadius: s(3),
    elevation: 2,
  },
  heroNameWrap: {
    flex: 1,
    gap: s(4),
  },
  heroName: {
    fontSize: s(22),
    fontWeight: '900',
    color: T1,
    letterSpacing: -0.4,
  },
  heroMetaText: {
    fontSize: s(13),
    color: T2,
    fontWeight: '800',
  },

  // ── 섹션 / 카드 ──
  section: {
    paddingHorizontal: s(16),
    paddingTop: s(10),
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: s(20),
    padding: s(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.12,
    shadowRadius: s(12),
    elevation: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    marginBottom: s(12),
    paddingBottom: s(10),
  },
  sectionIcon: {
    width: s(32),
    height: s(32),
    borderRadius: s(10),
    backgroundColor: BLUE_L,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: s(18),
    fontWeight: '800',
    color: T1,
  },

  // 제목 + 본문
  titleText: {
    fontSize: s(18),
    fontWeight: '900',
    color: T1,
    letterSpacing: -0.4,
    lineHeight: s(26),
    marginBottom: s(12),
  },
  divider: {
    height: 1,
    backgroundColor: DIV,
    marginBottom: s(12),
  },
  bodyText: {
    fontSize: s(14),
    color: '#374151',
    lineHeight: s(24),
  },

  // 요청 정보 행
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: s(13),
    borderTopWidth: 1,
    borderTopColor: DIV,
  },
  infoLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  infoEmoji: { fontSize: s(14) },
  infoLabel: { fontSize: s(16), color: T1, fontWeight: '600' },
  infoValue: { fontSize: s(16), fontWeight: '700', color: T1 },

  // 소통 방식
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodRow: {
    flexDirection: 'row',
    gap: s(8),
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    paddingHorizontal: s(14),
    paddingVertical: s(8),
    borderRadius: s(20),
    borderWidth: s(1.5),
  },
  methodChipSelected: {
    backgroundColor: BLUE_L,
    borderColor: BLUE,
  },
  methodChipUnselected: {
    backgroundColor: '#F3F4F8',
    borderColor: DIV,
  },
  methodDot: { width: s(7), height: s(7), borderRadius: s(4) },
  methodChipText: { fontSize: s(13), fontWeight: '700' },
  methodChipTextOn: { color: BLUE },
  methodChipTextOff: { color: T2 },

  // 헬퍼
  helperItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  helperAvatar: {
    width: s(50),
    height: s(50),
    borderRadius: s(25),
    flexShrink: 0,
  },
  helperAvatarFallback: {
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperAvatarText: { fontSize: s(18), fontWeight: '700', color: '#FFFFFF' },
  helperInfo: { flex: 1 },
  helperName: { fontSize: s(15), fontWeight: '800', color: T1 },
  helperDetail: { fontSize: s(12), color: T2, marginTop: s(2) },
  helperRating: { fontSize: s(12), color: '#F59E0B', marginTop: s(3) },
  helperRatingNum: { color: T2, fontWeight: '600' },

  bottomPadding: { height: s(24) },

  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(8),
    marginTop: s(12),
  },
  photoThumb: {
    width: s(90),
    height: s(90),
    borderRadius: s(12),
    backgroundColor: BG,
  },

  // ── 하단 CTA ──
  cta: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: s(16),
    marginBottom: Platform.OS === 'ios' ? s(32) : s(16),
    paddingHorizontal: s(16),
    paddingVertical: s(12),
    borderRadius: s(24),
    flexDirection: 'row',
    gap: s(10),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.12,
    shadowRadius: s(12),
    elevation: 6,
  },
  bookmarkBtn: {
    width: s(50),
    height: s(50),
    borderRadius: s(14),
    backgroundColor: BLUE_L,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  helpBtn: {
    flex: 1,
    height: s(50),
    backgroundColor: BLUE,
    borderRadius: s(14),
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: s(6),
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.35,
    shadowRadius: s(20),
    elevation: 8,
  },
  helpBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  helpBtnEmoji: { fontSize: s(16) },
  helpBtnText: {
    color: '#FFFFFF',
    fontSize: s(18),
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  myPostActions: {
    flex: 1,
    flexDirection: 'row',
    gap: s(8),
  },
  editBtn: {
    flex: 1,
    height: s(50),
    borderRadius: s(14),
    borderWidth: s(1.5),
    borderColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: s(15),
    fontWeight: '800',
    color: BLUE,
  },
  deleteBtn: {
    flex: 1,
    height: s(50),
    borderRadius: s(14),
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: s(15),
    fontWeight: '800',
    color: '#DC2626',
  },
  closedBtn: {
    flex: 1,
    height: s(50),
    backgroundColor: '#F3F4F6',
    borderRadius: s(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedBtnText: { fontSize: s(14), color: T2, fontWeight: '600' },
});
