// 타인 프로필 조회 화면
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getPublicUserProfile } from '../services/authService';
import { blockUser, getBlockStatus, unblockUser } from '../services/blockService';
import { getOrCreateDirectRoom } from '../services/directChatService';
import type { CommunityPostDto } from '../services/communityService';
import { getUserCommunityPosts } from '../services/communityService';
import { getUserHelpHistory, getUserRequestHistory } from '../services/helpService';
import type { ReviewResponse } from '../services/reviewService';
import { getMyReviews } from '../services/reviewService';
import { useAuthStore } from '../stores/authStore';
import type { HelpCategory, HelpRequest, RequestStatus, User } from '../types';
import { getInitial } from '../utils/getInitial';
import { s as sc } from '../utils/scale';

const BLUE    = '#3B6FE8';
const BLUE_BG = '#F5F8FF';
const BLUE_L  = '#EEF4FF';
const BORDER  = '#D4E4FA';
const T1      = '#0E1E40';
const T2      = '#6B7A99';

const SERVER_BASE_URL = 'https://backend-production-0a6f.up.railway.app';

const NATIONALITY_MAP: Record<string, { flag: string; name: string }> = {
  KR: { flag: '🇰🇷', name: '대한민국' },
  CN: { flag: '🇨🇳', name: '중국' },
  JP: { flag: '🇯🇵', name: '일본' },
  MN: { flag: '🇲🇳', name: '몽골' },
  TW: { flag: '🇹🇼', name: '대만' },
  HK: { flag: '🇭🇰', name: '홍콩' },
  VN: { flag: '🇻🇳', name: '베트남' },
  PH: { flag: '🇵🇭', name: '필리핀' },
  US: { flag: '🇺🇸', name: '미국' },
  CA: { flag: '🇨🇦', name: '캐나다' },
  AU: { flag: '🇦🇺', name: '호주' },
  GB: { flag: '🇬🇧', name: '영국' },
  DE: { flag: '🇩🇪', name: '독일' },
  FR: { flag: '🇫🇷', name: '프랑스' },
  RU: { flag: '🇷🇺', name: '러시아' },
  TH: { flag: '🇹🇭', name: '태국' },
  ID: { flag: '🇮🇩', name: '인도네시아' },
  MY: { flag: '🇲🇾', name: '말레이시아' },
  IN: { flag: '🇮🇳', name: '인도' },
  BR: { flag: '🇧🇷', name: '브라질' },
  MX: { flag: '🇲🇽', name: '멕시코' },
  UZ: { flag: '🇺🇿', name: '우즈베키스탄' },
  KZ: { flag: '🇰🇿', name: '카자흐스탄' },
};

const USER_TYPE_LABEL: Record<string, string> = {
  KOREAN: '한국인',
  INTERNATIONAL: '유학생',
  EXCHANGE: '교환학생',
};

const CATEGORY_EMOJI: Record<HelpCategory, string> = {
  BANK: '🏦', HOSPITAL: '🏥', SCHOOL: '🏫', DAILY: '🏠', OTHER: '📌',
};
const CATEGORY_LABEL: Record<HelpCategory, string> = {
  BANK: '은행', HOSPITAL: '병원', SCHOOL: '학교', DAILY: '생활', OTHER: '기타',
};
const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  WAITING:     { label: '모집중',    bg: '#D1FAE5', color: '#065F46' },
  MATCHED:     { label: '대기중',    bg: '#EEF4FF', color: BLUE },
  IN_PROGRESS: { label: '진행중',    bg: '#FEF3C7', color: '#92400E' },
  COMPLETED:   { label: '도움 완료', bg: '#D1FAE5', color: '#065F46' },
  CANCELLED:   { label: '취소됨',    bg: '#FEE2E2', color: '#991B1B' },
};
const POST_CATEGORY_LABEL: Record<string, string> = {
  INFO: '일반', QUESTION: '로컬', CHAT: '모임', CULTURE: '장터',
};

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

const AVATAR_COLORS = ['#F0A040', '#F06060', BLUE, '#90C4F0', '#A0A8B0'];

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

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgFullscreen, setImgFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'help' | 'community' | null>(null);
  const [helpHistory, setHelpHistory] = useState<HelpRequest[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPostDto[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, blockRes] = await Promise.all([
        getPublicUserProfile(Number(id)),
        getBlockStatus(Number(id)),
      ]);
      if (profileRes.success) setUser(profileRes.data);
      if (blockRes.success) setIsBlocked(blockRes.data.isBlocked);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    if (!id || !activeTab) return;
    const userId = Number(id);
    setTabLoading(true);
    if (activeTab === 'help') {
      const isKorean = user?.userType === 'KOREAN';
      const fetchFn = isKorean ? getUserHelpHistory : getUserRequestHistory;
      fetchFn(userId)
        .then((res) => { if (res.success) setHelpHistory(res.data); })
        .catch(() => {})
        .finally(() => setTabLoading(false));
    } else {
      getUserCommunityPosts(userId)
        .then((res) => { if (res.success) setCommunityPosts(res.data); })
        .catch(() => {})
        .finally(() => setTabLoading(false));
    }
  }, [activeTab, id]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={s.centered}>
        <Text style={s.notFoundText}>프로필을 찾을 수 없어요.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={s.backLink}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const profileUri = toAbsoluteUrl(user.profileImage);
  const nationality = user.nationality ? (NATIONALITY_MAP[user.nationality] ?? { flag: '🌏', name: user.nationality }) : null;
  const hobbies = user.hobbies ? user.hobbies.split(',').map((h) => h.trim()).filter(Boolean) : [];

  return (
    <View style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={T1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>프로필</Text>
        <TouchableOpacity
          style={s.blockHeaderBtn}
          activeOpacity={0.8}
          disabled={blockLoading}
          onPress={() => {
            if (isBlocked) {
              Alert.alert('차단 해제', '이 사용자의 차단을 해제하시겠어요?', [
                { text: '취소', style: 'cancel' },
                {
                  text: '해제',
                  onPress: async () => {
                    setBlockLoading(true);
                    try {
                      await unblockUser(Number(id));
                      setIsBlocked(false);
                    } catch {
                      Alert.alert('오류', '차단 해제에 실패했습니다.');
                    } finally {
                      setBlockLoading(false);
                    }
                  },
                },
              ]);
            } else {
              Alert.alert('차단하기', '이 사용자를 차단하시겠어요?\n차단한 사용자의 글과 메시지가 보이지 않습니다.', [
                { text: '취소', style: 'cancel' },
                {
                  text: '차단',
                  style: 'destructive',
                  onPress: async () => {
                    setBlockLoading(true);
                    try {
                      await blockUser(Number(id));
                      setIsBlocked(true);
                    } catch {
                      Alert.alert('오류', '차단에 실패했습니다.');
                    } finally {
                      setBlockLoading(false);
                    }
                  },
                },
              ]);
            }
          }}
        >
          <Ionicons name="ban-outline" size={14} color="#EF4444" />
          <Text style={s.blockHeaderText}>{isBlocked ? '차단해제' : '차단하기'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* 상단 흰색 섹션 */}
        <View style={s.topSection}>
          {/* 프로필 상단 */}
          <View style={s.avatarSection}>
            <TouchableOpacity
              activeOpacity={profileUri ? 0.8 : 1}
              onPress={() => { if (profileUri) setImgFullscreen(true); }}
            >
              {profileUri ? (
                <Image source={{ uri: profileUri }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, { backgroundColor: avatarColor(user.nickname) }]}>
                  <Text style={s.avatarInitial}>{getInitial(user.nickname)}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={s.avatarInfo}>
              {/* 이름 + 나이 */}
              <View style={s.nameRow}>
                <Text style={s.nameText}>
                  {user.nickname}
                  {user.age ? <Text style={s.ageText}> ({user.age})</Text> : null}
                </Text>
                {(user.studentIdVerified || user.studentIdStatus === 'APPROVED') && (
                  <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
                )}
              </View>
              {/* 국가 */}
              {(nationality || user.userType === 'KOREAN') ? (
                <View style={s.schoolRow}>
                  <Ionicons name="flag-outline" size={14} color={T2} />
                  <Text style={s.schoolText}>
                    {nationality ? nationality.name : '대한민국'}
                  </Text>
                </View>
              ) : null}
              {/* 학교(학과) */}
              {user.university ? (
                <View style={s.schoolRow}>
                  <Ionicons name="school-outline" size={14} color={T2} />
                  <Text style={s.schoolText}>
                    {user.university}{user.major ? `(${user.major})` : ''}
                  </Text>
                </View>
              ) : null}
              {/* 별점 */}
              <TouchableOpacity
                style={s.ratingRow}
                activeOpacity={0.7}
                onPress={() => {
                  setReviewModal(true);
                  if (reviews.length === 0) {
                    setReviewsLoading(true);
                    getMyReviews(Number(id))
                      .then((data) => setReviews(data))
                      .catch(() => {})
                      .finally(() => setReviewsLoading(false));
                  }
                }}
              >
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={s.ratingText}>{Number(user.rating ?? 0).toFixed(1)} <Text style={s.ratingCount}>({user.ratingCount ?? 0})</Text></Text>
                <Ionicons name="chevron-forward" size={14} color="#F59E0B" style={{ marginTop: 1, marginLeft: -2 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 자기소개 */}
          {user.bio ? (
            <Text style={s.bioText}>{user.bio}</Text>
          ) : null}

          {/* MBTI / 취미 */}
          {(user.mbti || hobbies.length > 0) ? (
            <View style={s.mbtiHobbyRow}>
              {user.mbti ? (
                <View style={s.mbtiCol}>
                  <View style={s.infoIcon}>
                    <Ionicons name="person-outline" size={16} color={BLUE} />
                  </View>
                  <View style={s.infoTextBlock}>
                    <Text style={s.mbtiText}>{user.mbti.toUpperCase()}</Text>
                  </View>
                </View>
              ) : null}

              {hobbies.length > 0 ? (
                <View style={s.hobbyCol}>
                  <View style={s.infoIcon}>
                    <Ionicons name="heart-outline" size={16} color={BLUE} />
                  </View>
                  <View style={s.infoTextBlock}>
                    <View style={s.hobbyWrap}>
                      {hobbies.map((h, idx) => (
                        <View key={idx} style={s.hobbyChip}>
                          <Text style={s.hobbyText}>{h}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* 구분선 */}
        <View style={s.sectionDivider} />

        {/* 도움내역 / 커뮤니티 탭 버튼 */}
        <View style={s.tabBtnRow}>
          <TouchableOpacity style={[s.tabBtn, s.tabBtnLeft]} activeOpacity={0.8} onPress={() => setActiveTab('help')}>
            <Text style={[s.tabBtnText, activeTab === 'help' && s.tabBtnActive]}>도움내역</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tabBtn} activeOpacity={0.8} onPress={() => setActiveTab('community')}>
            <Text style={[s.tabBtnText, activeTab === 'community' && s.tabBtnActive]}>커뮤니티</Text>
          </TouchableOpacity>
        </View>
        <View style={s.sectionDivider} />

        {/* 탭 콘텐츠 */}
        {!activeTab ? null : tabLoading ? (
          <ActivityIndicator color={BLUE} style={{ marginTop: 32 }} />
        ) : activeTab === 'help' ? (
          helpHistory.length === 0 ? (
            <View style={s.emptyTab}>
              <Text style={s.emptyTabText}>도움 내역이 없어요</Text>
            </View>
          ) : (
            helpHistory.map((item) => {
              const st = STATUS_CONFIG[item.status];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={s.listCard}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/request-detail', params: { id: item.id } })}
                >
                  <View style={s.listCardIcon}>
                    <Text style={{ fontSize: 20 }}>{CATEGORY_EMOJI[item.category]}</Text>
                  </View>
                  <View style={s.listCardBody}>
                    <View style={s.listCardTop}>
                      <Text style={s.listCardCategory}>{CATEGORY_LABEL[item.category]}</Text>
                      <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[s.statusBadgeText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                    <Text style={s.listCardTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={s.listCardTime}>{formatTime(item.createdAt)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )
        ) : (
          (() => {
            const myNationality = currentUser?.nationality ?? null;
            const filtered = communityPosts.filter((p) => {
              if (p.category !== 'QUESTION') return true;
              const authorNationality = p.authorNationality ?? null;
              if (myNationality === null) return authorNationality === null;
              return authorNationality === myNationality;
            });
            return filtered.length === 0 ? (
            <View style={s.emptyTab}>
              <Text style={s.emptyTabText}>작성한 글이 없어요</Text>
            </View>
          ) : (
            filtered.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={s.listCard}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/community-post', params: { id: item.id } })}
              >
                <View style={s.listCardBody}>
                  <View style={s.listCardTop}>
                    <Text style={s.listCardCategory}>{POST_CATEGORY_LABEL[item.category] ?? item.category}</Text>
                    <Text style={s.listCardTime}>{formatTime(item.createdAt)}</Text>
                  </View>
                  <Text style={s.listCardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={s.listCardDesc} numberOfLines={1}>{item.content}</Text>
                </View>
              </TouchableOpacity>
            ))
          );
          })()
        )}
      </ScrollView>

      {/* 별점 리뷰 모달 */}
      <Modal visible={reviewModal} transparent animationType="slide" onRequestClose={() => setReviewModal(false)}>
        <View style={s.reviewOverlay}>
          <View style={s.reviewSheet}>
            <View style={s.reviewSheetHeader}>
              <Text style={s.reviewSheetTitle}>받은 후기</Text>
              <TouchableOpacity onPress={() => setReviewModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={T1} />
              </TouchableOpacity>
            </View>
            {reviewsLoading ? (
              <ActivityIndicator color={BLUE} style={{ marginTop: 40 }} />
            ) : reviews.length === 0 ? (
              <View style={s.reviewEmpty}>
                <Text style={s.reviewEmptyText}>아직 받은 후기가 없어요</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
                {reviews.map((r) => (
                  <View key={r.id} style={s.reviewCard}>
                    <View style={s.reviewCardTop}>
                      <View style={s.reviewStars}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Ionicons key={i} name="star" size={14} color={i <= r.rating ? '#F59E0B' : '#E5E7EB'} />
                        ))}
                      </View>
                      <Text style={s.reviewTime}>{formatTime(r.createdAt)}</Text>
                    </View>
                    {r.helpRequestTitle ? (
                      <Text style={s.reviewRequestTitle} numberOfLines={1}>{r.helpRequestTitle}</Text>
                    ) : null}
                    {r.comment ? (
                      <Text style={s.reviewComment}>{r.comment}</Text>
                    ) : null}
                    <Text style={s.reviewerName}>{r.reviewer.nickname}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 프로필 사진 풀스크린 */}
      {profileUri ? (
        <Modal visible={imgFullscreen} transparent animationType="fade" onRequestClose={() => setImgFullscreen(false)}>
          <View style={s.fsOverlay}>
            <Image source={{ uri: profileUri }} style={s.fsImage} resizeMode="contain" />
            <TouchableOpacity style={s.fsClose} onPress={() => setImgFullscreen(false)} activeOpacity={0.8}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      ) : null}

      {/* 하단 버튼 바 */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.chatBtn, chatLoading && { opacity: 0.7 }]}
          activeOpacity={0.8}
          disabled={chatLoading}
          onPress={async () => {
            if (!user) return;
            setChatLoading(true);
            try {
              const res = await getOrCreateDirectRoom(Number(id));
              if (res.success) {
                router.push({
                  pathname: '/chatroom',
                  params: {
                    roomId: res.data.id,
                    requestTitle: user.nickname,
                    partnerNickname: user.nickname,
                    partnerProfileImage: toAbsoluteUrl(user.profileImage) ?? '',
                    isDirect: 'true',
                    roomUnreadCount: String(res.data.unreadCount ?? 0),
                  },
                });
              }
            } catch {
              // ignore
            } finally {
              setChatLoading(false);
            }
          }}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={s.chatBtnText}>채팅하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLUE_BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BLUE_BG },
  notFoundText: { fontSize: sc(16), fontWeight: '700', color: T1 },
  backLink: { fontSize: sc(14), color: BLUE, fontWeight: '700' },

  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: sc(12),
    paddingHorizontal: sc(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: sc(1),
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: sc(36), height: sc(36), borderRadius: sc(18),
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: sc(15), fontWeight: '800', color: T1 },

  scroll: { paddingBottom: sc(120) },
  topSection: { backgroundColor: '#fff', paddingHorizontal: sc(16), paddingTop: sc(24), paddingBottom: sc(6), gap: sc(12) },
  sectionDivider: { height: sc(1), backgroundColor: BORDER },
  tabBtnRow: { flexDirection: 'row', backgroundColor: '#fff' },
  tabBtn: { width: '50%', paddingVertical: sc(14), alignItems: 'center', justifyContent: 'center' },
  tabBtnLeft: { borderRightWidth: sc(1), borderRightColor: BORDER },
  tabBtnText: { fontSize: sc(14), fontWeight: '700', color: T2 },
  tabBtnActive: { color: BLUE },

  emptyTab: { paddingVertical: sc(60), alignItems: 'center' },
  emptyTabText: { fontSize: sc(14), color: T2 },

  listCard: {
    backgroundColor: '#fff', marginHorizontal: sc(16), marginTop: sc(10),
    borderRadius: sc(14), padding: sc(14), flexDirection: 'row', gap: sc(12),
    borderWidth: sc(1), borderColor: BORDER,
  },
  listCardIcon: {
    width: sc(44), height: sc(44), borderRadius: sc(12), backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  listCardBody: { flex: 1, gap: sc(4) },
  listCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listCardCategory: { fontSize: sc(11), fontWeight: '600', color: T2 },
  listCardTitle: { fontSize: sc(14), fontWeight: '700', color: T1 },
  listCardDesc: { fontSize: sc(12), color: T2 },
  listCardTime: { fontSize: sc(11), color: T2 },
  statusBadge: { paddingHorizontal: sc(8), paddingVertical: sc(3), borderRadius: sc(20) },
  statusBadgeText: { fontSize: sc(11), fontWeight: '700' },


  avatarSection: {
    flexDirection: 'row', alignItems: 'center', gap: sc(16), marginBottom: sc(4),
  },
  avatarInfo: { flex: 1, gap: sc(2) },
  avatar: {
    width: sc(88), height: sc(88), borderRadius: sc(44),
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  avatarInitial: { fontSize: sc(34), fontWeight: '800', color: '#fff' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: sc(6) },
  nameText: { fontSize: sc(22), fontWeight: '800', color: T1, lineHeight: sc(26) },
  ageText: { fontSize: sc(22), fontWeight: '800', color: T1, lineHeight: sc(26) },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: sc(4) },
  ratingText: { fontSize: sc(14), fontWeight: '700', color: '#F59E0B' },
  ratingCount: { fontSize: sc(14), fontWeight: '700', color: '#F59E0B' },
  typeBadge: {},
  typeBadgeText: { fontSize: sc(13), fontWeight: '600', color: T2 },
  schoolRow: { flexDirection: 'row', alignItems: 'center', gap: sc(5) },
  schoolText: { fontSize: sc(13), fontWeight: '500', color: T2, flexShrink: 1 },

  card: {
    backgroundColor: '#fff',
    borderRadius: sc(16),
    borderWidth: sc(1), borderColor: BORDER,
    paddingHorizontal: sc(16),
    overflow: 'hidden',
  },
  cardLabel: { fontSize: sc(12), fontWeight: '700', color: T2, marginTop: sc(14), marginBottom: sc(6) },
  bioText: { fontSize: sc(15), color: T1, lineHeight: sc(23), marginTop: -10 },

  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: sc(12),
    paddingVertical: sc(14),
  },
  infoRowBorder: { borderTopWidth: sc(1), borderTopColor: BORDER },
  infoIcon: {
    width: sc(32), height: sc(32), borderRadius: sc(10),
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0, marginTop: sc(1),
  },
  infoLabel: { fontSize: sc(11), fontWeight: '600', color: T2, marginBottom: sc(3) },
  infoValue: { fontSize: sc(14), fontWeight: '700', color: T1 },
  majorText: { fontSize: sc(13), fontWeight: '500', color: T2 },
  mbtiText: { fontSize: sc(11), fontWeight: '600', color: BLUE, flexShrink: 0 },

  mbtiHobbyRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: -14 },
  mbtiCol: { width: sc(75), flexDirection: 'row', alignItems: 'center', gap: sc(10), paddingVertical: sc(10) },
  hobbyCol: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: sc(10), paddingVertical: sc(10) },
  hobbyColBorder: {},
  infoTextBlock: { flex: 1, gap: sc(3) },

  hobbyWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: sc(6), marginTop: sc(2) },
  hobbyChip: {
    paddingHorizontal: sc(10), paddingVertical: sc(4),
    backgroundColor: BLUE_L, borderRadius: sc(20),
  },
  hobbyText: { fontSize: sc(11), fontWeight: '600', color: BLUE },

  reviewOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  reviewSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '75%', paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  reviewSheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  reviewSheetTitle: { fontSize: 16, fontWeight: '700', color: T1 },
  reviewEmpty: { paddingVertical: 60, alignItems: 'center' },
  reviewEmptyText: { fontSize: 14, color: T2 },
  reviewCard: {
    backgroundColor: BLUE_L, borderRadius: 12, padding: 14, gap: 6,
  },
  reviewCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewTime: { fontSize: 11, color: T2 },
  reviewRequestTitle: { fontSize: 12, color: T2 },
  reviewComment: { fontSize: 14, color: T1, lineHeight: 20 },
  reviewerName: { fontSize: 12, fontWeight: '600', color: BLUE },

  fsOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  fsImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').width,
  },
  fsClose: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 36, right: 16,
    width: sc(36), height: sc(36), borderRadius: sc(18),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: sc(10),
    paddingHorizontal: sc(16),
    paddingTop: sc(12),
    paddingBottom: Platform.OS === 'ios' ? 34 : sc(16),
    backgroundColor: '#fff',
    borderTopWidth: sc(1), borderTopColor: BORDER,
  },
  blockHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: sc(4),
    paddingHorizontal: sc(10), paddingVertical: sc(6),
    borderRadius: sc(20), backgroundColor: '#FFF5F5',
    borderWidth: sc(1), borderColor: '#FECACA',
  },
  blockHeaderText: { fontSize: sc(12), fontWeight: '700', color: '#EF4444' },
  chatBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sc(8),
    backgroundColor: BLUE, borderRadius: sc(14),
    paddingVertical: sc(14),
  },
  chatBtnText: { fontSize: sc(15), fontWeight: '800', color: '#fff' },
});
