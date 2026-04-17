// 타인 프로필 조회 화면
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { getInitial } from '../utils/getInitial';
import { s as sc } from '../utils/scale';
import { getPublicUserProfile } from '../services/authService';
import type { User } from '../types';

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgFullscreen, setImgFullscreen] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await getPublicUserProfile(Number(id));
      if (res.success) setUser(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

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
        <TouchableOpacity style={s.blockHeaderBtn} activeOpacity={0.8}>
          <Ionicons name="ban-outline" size={14} color="#EF4444" />
          <Text style={s.blockHeaderText}>차단하기</Text>
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
              <Text style={s.nameText}>
                {user.nickname}
                {user.age ? <Text style={s.ageText}> ({user.age})</Text> : null}
              </Text>
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
              <View style={s.ratingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={s.ratingText}>{Number(user.rating ?? 0).toFixed(1)} <Text style={s.ratingCount}>({user.ratingCount ?? 0})</Text></Text>
              </View>
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

        {/* 도움 내역 / 작성한 글 버튼 */}
        <View style={s.tabBtnRow}>
          <TouchableOpacity style={[s.tabBtn, s.tabBtnLeft]} activeOpacity={0.8}>
            <Text style={s.tabBtnText}>도움내역</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tabBtn} activeOpacity={0.8}>
            <Text style={s.tabBtnText}>커뮤니티</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
        <TouchableOpacity style={s.chatBtn} activeOpacity={0.8}>
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
