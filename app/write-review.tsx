// 후기 작성 화면
import { useState } from 'react';
import { getInitial } from '../utils/getInitial';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, Alert, ActivityIndicator, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { s as sc } from '../utils/scale';
import { createReview } from '../services/reviewService';

const BLUE   = '#3B6FE8';
const BLUE_L = '#EEF4FF';
const BORDER = '#D0E0F8';
const T1     = '#0C1C3C';
const T2     = '#A8C8FA';
const BG     = '#F5F8FF';
const ORANGE = '#F97316';

const AVATAR_COLORS = ['#3B6FE8', '#6B9DF0', '#A8C8FA', '#5B8DEF', '#4A7CE0'];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

export default function WriteReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    helpRequestId: string;
    partnerNickname: string;
    partnerProfileImage?: string;
    requestTitle: string;
  }>();

  const helpRequestId = Number(params.helpRequestId);
  const partnerNickname = params.partnerNickname ?? '상대방';
  const partnerProfileImage = params.partnerProfileImage || null;
  const requestTitle = params.requestTitle ?? '도움 요청';

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('별점을 선택해주세요');
      return;
    }
    setSubmitting(true);
    try {
      await createReview(helpRequestId, { rating, comment: comment.trim() || undefined });
      Alert.alert('후기 작성 완료', '후기가 등록되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('오류', msg ?? '후기 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={T1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>후기 작성</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.body}>
        {/* 상대 정보 */}
        <View style={s.partnerCard}>
          {partnerProfileImage && !imgError
            ? <Image source={{ uri: partnerProfileImage }} style={s.avatar} onError={() => setImgError(true)} />
            : <View style={[s.avatar, { backgroundColor: avatarColor(partnerNickname) }]}>
                <Text style={s.avatarText}>{getInitial(partnerNickname)}</Text>
              </View>
          }
          <View style={s.partnerInfo}>
            <Text style={s.partnerName}>{partnerNickname}</Text>
            <Text style={s.partnerSub} numberOfLines={1}>{requestTitle}</Text>
          </View>
        </View>

        {/* 별점 */}
        <View style={s.ratingSection}>
          <Text style={s.sectionLabel}>별점</Text>
          <View style={s.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? ORANGE : T2}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={s.ratingLabel}>
              {['', '별로였어요', '아쉬웠어요', '괜찮았어요', '좋았어요', '최고였어요'][rating]}
            </Text>
          )}
        </View>

        {/* 후기 텍스트 */}
        <View style={s.commentSection}>
          <Text style={s.sectionLabel}>후기 <Text style={s.optional}>(선택)</Text></Text>
          <TextInput
            style={s.commentInput}
            placeholder="상대방에 대한 후기를 남겨주세요..."
            placeholderTextColor={T2}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={300}
          />
          <Text style={s.charCount}>{comment.length}/300</Text>
        </View>

        {/* 제출 버튼 */}
        <TouchableOpacity
          style={[s.submitBtn, (rating === 0 || submitting) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
          activeOpacity={0.8}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.submitBtnText}>후기 등록</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: BG,
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

  body: { padding: sc(20), gap: sc(28) },

  partnerCard: {
    flexDirection: 'row', alignItems: 'center', gap: sc(14),
    backgroundColor: '#fff',
    borderRadius: sc(16), padding: sc(16),
    borderWidth: sc(1), borderColor: BORDER,
  },
  avatar: {
    width: sc(52), height: sc(52), borderRadius: sc(26),
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: sc(20), fontWeight: '700', color: '#fff' },
  partnerInfo: { flex: 1 },
  partnerName: { fontSize: sc(16), fontWeight: '800', color: T1 },
  partnerSub: { fontSize: sc(12), color: T2, marginTop: sc(3) },

  ratingSection: { alignItems: 'center', gap: sc(12) },
  sectionLabel: { fontSize: sc(14), fontWeight: '700', color: T1, alignSelf: 'flex-start' },
  stars: { flexDirection: 'row', gap: sc(8) },
  ratingLabel: { fontSize: sc(14), fontWeight: '700', color: ORANGE },

  commentSection: { gap: sc(8) },
  optional: { fontSize: sc(12), fontWeight: '400', color: T2 },
  commentInput: {
    backgroundColor: '#fff',
    borderRadius: sc(14), borderWidth: sc(1), borderColor: BORDER,
    padding: sc(14), fontSize: sc(14), color: T1,
    minHeight: sc(120), textAlignVertical: 'top',
  },
  charCount: { fontSize: sc(11), color: T2, alignSelf: 'flex-end' },

  submitBtn: {
    backgroundColor: BLUE, borderRadius: sc(14),
    paddingVertical: sc(16), alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: sc(15), fontWeight: '800', color: '#fff' },
});
