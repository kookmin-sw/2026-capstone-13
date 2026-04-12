// 내가 받은 후기 목록 화면
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, ActivityIndicator, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { getMyReviews, type ReviewResponse } from '../services/reviewService';

const BLUE   = '#3B6FE8';
const BLUE_L = '#EEF4FF';
const BORDER = '#D0E0F8';
const T1     = '#0C1C3C';
const T2     = '#A8C8FA';
const BG     = '#F5F8FF';
const ORANGE = '#F97316';

const SERVER_BASE_URL = 'https://backend-production-0a6f.up.railway.app';
const AVATAR_COLORS = ['#3B6FE8', '#6B9DF0', '#A8C8FA', '#5B8DEF', '#4A7CE0'];

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

function formatTime(createdAt: string): string {
  const utc = createdAt.includes('Z') || createdAt.includes('+') ? createdAt : createdAt + 'Z';
  const diff = Date.now() - new Date(utc).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function Stars({ rating }: { rating: number }) {
  return (
    <View style={s.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={14}
          color={star <= rating ? ORANGE : T2}
        />
      ))}
    </View>
  );
}

function ReviewCard({ item }: { item: ReviewResponse }) {
  const [imgError, setImgError] = useState(false);
  const profileUri = toAbsoluteUrl(item.reviewer.profileImage);

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        {profileUri && !imgError
          ? <Image source={{ uri: profileUri }} style={s.avatar} onError={() => setImgError(true)} />
          : <View style={[s.avatar, { backgroundColor: avatarColor(item.reviewer.nickname) }]}>
              <Text style={s.avatarText}>{item.reviewer.nickname.charAt(0)}</Text>
            </View>
        }
        <View style={s.reviewerInfo}>
          <Text style={s.reviewerName}>{item.reviewer.nickname}</Text>
          <Stars rating={item.rating} />
        </View>
        <Text style={s.time}>{formatTime(item.createdAt)}</Text>
      </View>
      <Text style={s.helpTitle} numberOfLines={1}>
        <Ionicons name="document-text-outline" size={11} color={T2} /> {item.helpRequestTitle ?? '도움 요청'}
      </Text>
      {item.comment ? (
        <Text style={s.comment}>{item.comment}</Text>
      ) : (
        <Text style={s.noComment}>후기 내용 없음</Text>
      )}
    </View>
  );
}

export default function MyReviewsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getMyReviews(user.id)
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={T1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>후기 관리</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={BLUE} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={s.list}
          ListHeaderComponent={
            reviews.length > 0 ? (
              <View style={s.summary}>
                <Text style={s.summaryRating}>{avgRating}</Text>
                <Ionicons name="star" size={20} color={ORANGE} />
                <Text style={s.summaryCount}>총 {reviews.length}개의 후기</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => <ReviewCard item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="star-outline" size={48} color={T2} />
              <Text style={s.emptyTitle}>아직 받은 후기가 없어요</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: BG,
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

  list: { padding: 14, paddingBottom: 60 },

  summary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  summaryRating: { fontSize: 22, fontWeight: '900', color: T1 },
  summaryCount: { fontSize: 13, color: T2, fontWeight: '600', marginLeft: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: BORDER,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  reviewerInfo: { flex: 1, gap: 3 },
  reviewerName: { fontSize: 13, fontWeight: '700', color: T1 },
  stars: { flexDirection: 'row', gap: 2 },
  time: { fontSize: 11, color: T2 },

  helpTitle: { fontSize: 11, color: T2, fontWeight: '600' },
  comment: { fontSize: 13, color: T1, lineHeight: 19 },
  noComment: { fontSize: 12, color: T2, fontStyle: 'italic' },

  empty: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T2 },
});
