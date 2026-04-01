// 커뮤니티 글 상세 화면
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Image, Keyboard, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCommunityPost, addCommunityComment, toggleCommunityLike, type CommunityPostDetailDto, type PostCommentDto } from '../services/communityService';
import { useAuthStore } from '../stores/authStore';

const BLUE    = '#3B6FE8';
const BLUE_BG = '#F5F8FF';
const BLUE_L  = '#EEF4FF';
const BORDER  = '#D0E0F8';
const T1      = '#0C1C3C';
const T2      = '#A8C8FA';
const T3      = '#6B9DF0';
const ORANGE  = '#F97316';

const CATEGORY_LABEL: Record<string, string> = {
  INFO: '정보공유', QUESTION: '질문', CHAT: '잡담', CULTURE: '문화교류',
};

const AVATAR_COLORS = ['#3B6FE8', '#6B9DF0', '#A8C8FA', '#5B8DEF', '#4A7CE0'];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function formatTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function CommunityPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [post, setPost] = useState<CommunityPostDetailDto | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [kavEnabled, setKavEnabled] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKavEnabled(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKavEnabled(false),
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await getCommunityPost(Number(id));
        if (res.success && res.data) {
          setPost(res.data);
          setIsLiked(res.data.liked);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={s.notFound}>
        <Text style={s.notFoundText}>게시글을 찾을 수 없어요.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backLink}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const comments: PostCommentDto[] = post.commentList ?? [];

  const handleLike = async () => {
    try {
      const res = await toggleCommunityLike(post.id);
      if (res.success && res.data) {
        setIsLiked(res.data.liked);
        setPost((prev) => prev ? { ...prev, likes: res.data.likes, liked: res.data.liked } : prev);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    try {
      const res = await addCommunityComment(post.id, text);
      if (res.success && res.data) {
        setPost((prev) => prev ? {
          ...prev,
          comments: prev.comments + 1,
          commentList: [...(prev.commentList ?? []), res.data],
        } : prev);
      }
    } catch {
      // ignore
    }
    setCommentText('');
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
      enabled={kavEnabled}
    >
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={T1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>게시글</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* 카테고리 배지 */}
        <View style={s.postWrap}>
          <View style={s.catRow}>
            <View style={s.catBadge}>
              <Text style={s.catBadgeText}>{CATEGORY_LABEL[post.category]}</Text>
            </View>
            {post.userType !== 'KOREAN' && (
              <View style={s.intlBadge}>
                <Text style={s.intlBadgeText}>{post.userType === 'EXCHANGE' ? '교환학생' : '유학생'}</Text>
              </View>
            )}
          </View>

          {/* 제목 */}
          <Text style={s.postTitle}>{post.title}</Text>

          {/* 작성자 정보 */}
          <View style={s.authorRow}>
            <View style={[s.avatar, { backgroundColor: avatarColor(post.author) }]}>
              <Text style={s.avatarText}>{post.author.charAt(0)}</Text>
            </View>
            <View>
              <Text style={s.authorName}>{post.author}</Text>
              <Text style={s.authorSub}>{post.university} · {formatTime(post.createdAt)}</Text>
            </View>
          </View>

          {/* 본문 */}
          <Text style={s.postContent}>{post.content}</Text>

          {/* 이미지 */}
          {post.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.imageScroll}>
              {post.images.map((uri, idx) => (
                <Image key={idx} source={{ uri }} style={s.image} />
              ))}
            </ScrollView>
          )}

          {/* 좋아요 / 댓글 수 */}
          <View style={s.reactionBar}>
            <TouchableOpacity style={s.reactionBtn} onPress={handleLike} activeOpacity={0.8}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={isLiked ? '#EF4444' : T2}
              />
              <Text style={[s.reactionCount, isLiked && s.reactionCountLiked]}>{post.likes}</Text>
            </TouchableOpacity>
            <View style={s.reactionBtn}>
              <Ionicons name="chatbubble-outline" size={17} color={T2} />
              <Text style={s.reactionCount}>{comments.length}</Text>
            </View>
          </View>
        </View>

        {/* 댓글 목록 */}
        <View style={s.commentSection}>
          <Text style={s.commentSectionTitle}>댓글 {comments.length}개</Text>
          {comments.length === 0 ? (
            <View style={s.noComment}>
              <Text style={s.noCommentText}>첫 댓글을 달아보세요!</Text>
            </View>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={s.commentItem}>
                <View style={[s.commentAvatar, { backgroundColor: avatarColor(c.author) }]}>
                  <Text style={s.commentAvatarText}>{c.author.charAt(0)}</Text>
                </View>
                <View style={s.commentBody}>
                  <View style={s.commentMeta}>
                    <Text style={s.commentAuthor}>{c.author}</Text>
                    {c.userType !== 'KOREAN' && (
                      <View style={s.commentIntlBadge}>
                        <Text style={s.commentIntlBadgeText}>{c.userType === 'EXCHANGE' ? '교환학생' : '유학생'}</Text>
                      </View>
                    )}
                    <Text style={s.commentTime}>{formatTime(c.createdAt)}</Text>
                  </View>
                  <Text style={s.commentContent}>{c.content}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* 댓글 입력 바 */}
      <View style={s.inputBar}>
        <View style={[s.commentAvatar, { backgroundColor: avatarColor(user?.nickname ?? '?') }]}>
          <Text style={s.commentAvatarText}>{(user?.nickname ?? '?').charAt(0)}</Text>
        </View>
        <TextInput
          style={s.commentInput}
          placeholder="댓글을 입력해주세요..."
          placeholderTextColor={T2}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[s.sendBtn, !commentText.trim() && s.sendBtnDisabled]}
          onPress={handleSubmitComment}
          disabled={!commentText.trim()}
        >
          <Ionicons name="send" size={16} color={commentText.trim() ? '#fff' : T2} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLUE_BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BLUE_BG },

  // 헤더
  header: {
    backgroundColor: BLUE_BG,
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

  scroll: { flex: 1 },

  // 게시글 본문
  postWrap: {
    backgroundColor: '#fff',
    padding: 18,
    borderBottomWidth: 8,
    borderBottomColor: BLUE_BG,
  },
  catRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  catBadge: {
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: BLUE_L, borderRadius: 8,
  },
  catBadgeText: { fontSize: 11, fontWeight: '800', color: BLUE },
  intlBadge: {
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: '#FFF0E6', borderRadius: 8,
  },
  intlBadgeText: { fontSize: 11, fontWeight: '800', color: '#C45A10' },

  postTitle: { fontSize: 18, fontWeight: '900', color: T1, lineHeight: 26, marginBottom: 14, letterSpacing: -0.4 },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  authorName: { fontSize: 13, fontWeight: '700', color: T1 },
  authorSub: { fontSize: 11, color: T2, marginTop: 1 },

  postContent: { fontSize: 14, color: T1, lineHeight: 22, marginBottom: 16 },

  imageScroll: { marginBottom: 16 },
  image: { width: 200, height: 200, borderRadius: 12, marginRight: 8 },

  reactionBar: {
    flexDirection: 'row', gap: 16,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: BORDER,
  },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reactionCount: { fontSize: 14, color: T2, fontWeight: '600' },
  reactionCountLiked: { color: '#EF4444' },

  // 댓글 섹션
  commentSection: { backgroundColor: '#fff', padding: 16 },
  commentSectionTitle: { fontSize: 14, fontWeight: '800', color: T1, marginBottom: 14 },
  noComment: { paddingVertical: 24, alignItems: 'center' },
  noCommentText: { fontSize: 13, color: T2 },

  commentItem: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  commentAvatar: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  commentAvatarText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  commentBody: { flex: 1 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  commentAuthor: { fontSize: 12, fontWeight: '700', color: T1 },
  commentIntlBadge: {
    paddingHorizontal: 6, paddingVertical: 1,
    backgroundColor: '#FFF0E6', borderRadius: 5,
  },
  commentIntlBadgeText: { fontSize: 9, fontWeight: '800', color: '#C45A10' },
  commentTime: { fontSize: 10, color: T2 },
  commentContent: { fontSize: 13, color: T1, lineHeight: 19 },

  // 댓글 입력바
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  commentInput: {
    flex: 1,
    backgroundColor: BLUE_BG,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 8,
    fontSize: 13, color: T1, maxHeight: 80,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: BLUE_L },

  // 없는 게시글
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  notFoundText: { fontSize: 16, color: T1, fontWeight: '700' },
  backLink: { fontSize: 14, color: BLUE, fontWeight: '700' },
});
