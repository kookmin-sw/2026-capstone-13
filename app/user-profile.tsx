// 타인 프로필 조회 화면
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getInitial } from '../utils/getInitial';
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
  KR: { flag: '🇰🇷', name: '한국' },
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
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* 프로필 이미지 */}
        <View style={s.avatarSection}>
          {profileUri ? (
            <Image source={{ uri: profileUri }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, { backgroundColor: avatarColor(user.nickname) }]}>
              <Text style={s.avatarInitial}>{getInitial(user.nickname)}</Text>
            </View>
          )}
          {/* 이름 + 나이 */}
          <Text style={s.nameText}>
            {user.nickname}
            {user.age ? <Text style={s.ageText}> ({user.age})</Text> : null}
          </Text>
          {/* 유저 타입 배지 */}
          <View style={s.typeBadge}>
            <Text style={s.typeBadgeText}>{USER_TYPE_LABEL[user.userType] ?? user.userType}</Text>
          </View>
        </View>

        {/* 자기소개 */}
        {user.bio ? (
          <View style={s.card}>
            <Text style={s.cardLabel}>자기소개</Text>
            <Text style={s.bioText}>{user.bio}</Text>
          </View>
        ) : null}

        {/* 국적 / 학교 / 학과 */}
        <View style={s.card}>
          {nationality ? (
            <View style={s.infoRow}>
              <View style={s.infoIcon}>
                <Ionicons name="flag-outline" size={16} color={BLUE} />
              </View>
              <View>
                <Text style={s.infoLabel}>국적</Text>
                <Text style={s.infoValue}>{nationality.flag} {nationality.name}</Text>
              </View>
            </View>
          ) : null}

          {user.university ? (
            <View style={[s.infoRow, (nationality) && s.infoRowBorder]}>
              <View style={s.infoIcon}>
                <Ionicons name="school-outline" size={16} color={BLUE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>학교</Text>
                <Text style={s.infoValue}>
                  {user.university}
                  {user.major ? <Text style={s.majorText}>  {user.major}</Text> : null}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* MBTI / 취미 */}
        {(user.mbti || hobbies.length > 0) ? (
          <View style={s.card}>
            {user.mbti ? (
              <View style={s.infoRow}>
                <View style={s.infoIcon}>
                  <Ionicons name="person-outline" size={16} color={BLUE} />
                </View>
                <View>
                  <Text style={s.infoLabel}>MBTI</Text>
                  <Text style={s.mbtiText}>{user.mbti.toUpperCase()}</Text>
                </View>
              </View>
            ) : null}

            {hobbies.length > 0 ? (
              <View style={[s.infoRow, user.mbti && s.infoRowBorder]}>
                <View style={s.infoIcon}>
                  <Ionicons name="heart-outline" size={16} color={BLUE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.infoLabel}>취미</Text>
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
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLUE_BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BLUE_BG },
  notFoundText: { fontSize: 16, fontWeight: '700', color: T1 },
  backLink: { fontSize: 14, color: BLUE, fontWeight: '700' },

  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: T1 },

  scroll: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 60, gap: 12 },

  avatarSection: { alignItems: 'center', marginBottom: 4 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarInitial: { fontSize: 38, fontWeight: '800', color: '#fff' },
  nameText: { fontSize: 22, fontWeight: '800', color: T1, marginBottom: 8 },
  ageText: { fontSize: 18, fontWeight: '600', color: T2 },
  typeBadge: {
    paddingHorizontal: 14, paddingVertical: 4,
    backgroundColor: BLUE_L, borderRadius: 20,
  },
  typeBadgeText: { fontSize: 13, fontWeight: '700', color: BLUE },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  cardLabel: { fontSize: 12, fontWeight: '700', color: T2, marginTop: 14, marginBottom: 6 },
  bioText: { fontSize: 14, color: T1, lineHeight: 22, marginBottom: 16 },

  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 14,
  },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  infoIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0, marginTop: 1,
  },
  infoLabel: { fontSize: 11, fontWeight: '600', color: T2, marginBottom: 3 },
  infoValue: { fontSize: 14, fontWeight: '700', color: T1 },
  majorText: { fontSize: 13, fontWeight: '500', color: T2 },
  mbtiText: { fontSize: 16, fontWeight: '800', color: BLUE },

  hobbyWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  hobbyChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: BLUE_L, borderRadius: 20,
  },
  hobbyText: { fontSize: 12, fontWeight: '600', color: BLUE },
});
