// 댓글 상세 + 대댓글 화면
import { useState, useRef, useEffect, useCallback } from 'react';
import { getInitial } from '../utils/getInitial';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Image, Keyboard, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getCommunityReplies, addCommunityReply, deleteCommunityComment,
  translateCommunityComment, type PostCommentDto,
} from '../services/communityService';
import { useAuthStore } from '../stores/authStore';

const BLUE   = '#3B6FE8';
const BLUE_L = '#EEF4FF';
const BORDER = '#D0E0F8';
const T1     = '#0C1C3C';
const T2     = '#A8C8FA';
const T3     = '#6B9DF0';
const SERVER_BASE_URL = 'https://backend-production-0a6f.up.railway.app';

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
function formatTime(createdAt: string): string {
  const utc = createdAt.includes('Z') || createdAt.includes('+') ? createdAt : createdAt + 'Z';
  const diff = Date.now() - new Date(utc).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function CommentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ commentId: string; postId: string; authorId: string; authorName: string; authorProfileImage: string; content: string; createdAt: string; userType: string }>();
  const { user } = useAuthStore();

  const commentId = Number(params.commentId);

  // 원댓글 정보 (params로 전달)
  const parentComment: Partial<PostCommentDto> = {
    id: commentId,
    authorId: params.authorId ? Number(params.authorId) : undefined,
    author: params.authorName,
    authorProfileImage: params.authorProfileImage,
    content: params.content,
    createdAt: params.createdAt,
    userType: params.userType,
  };

  const [replies, setReplies] = useState<PostCommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [kavEnabled, setKavEnabled] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // 번역 캐시: id → 번역된 텍스트
  const [translatedTexts, setTranslatedTexts] = useState<Record<number, string>>({});
  // 번역 표시 여부 토글
  const [showTranslation, setShowTranslation] = useState<Record<number, boolean>>({});
  const [translating, setTranslating] = useState<Record<number, boolean>>({});

  const handleTranslate = async (id: number) => {
    // 이미 번역 캐시 있으면 토글만
    if (translatedTexts[id]) {
      setShowTranslation((prev) => ({ ...prev, [id]: !prev[id] }));
      return;
    }
    setTranslating((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await translateCommunityComment(id);
      if (res.success) {
        setTranslatedTexts((prev) => ({ ...prev, [id]: res.data.content }));
        setShowTranslation((prev) => ({ ...prev, [id]: true }));
      }
    } catch {}
    finally { setTranslating((prev) => ({ ...prev, [id]: false })); }
  };

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

  const loadReplies = useCallback(async () => {
    try {
      const res = await getCommunityReplies(commentId);
      if (res.success) setReplies(res.data);
    } catch {}
    finally { setLoading(false); }
  }, [commentId]);

  useEffect(() => { loadReplies(); }, [loadReplies]);

  const handleSubmit = async () => {
    const text = replyText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const res = await addCommunityReply(commentId, text);
      if (res.success) {
        setReplies((prev) => [...prev, res.data]);
        setReplyText('');
        Keyboard.dismiss();
      }
    } catch {
      Alert.alert('오류', '답글 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = (replyId: number) => {
    Alert.alert('답글 삭제', '답글을 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCommunityComment(replyId);
            setReplies((prev) => prev.filter((r) => r.id !== replyId));
          } catch {
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const profileUri = toAbsoluteUrl(parentComment.authorProfileImage);

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={T1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>댓글</Text>
      </View>

      <ScrollView style={s.flex} contentContainerStyle={s.scrollContent}>
        {/* 원댓글 */}
        <View style={s.parentComment}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => parentComment.authorId && router.push({ pathname: '/user-profile', params: { id: parentComment.authorId } })}
          >
            {profileUri
              ? <Image source={{ uri: profileUri }} style={s.avatar} />
              : <View style={[s.avatar, { backgroundColor: avatarColor(parentComment.author ?? '') }]}>
                  <Text style={s.avatarText}>{getInitial(parentComment.author ?? '')}</Text>
                </View>
            }
          </TouchableOpacity>
          <View style={s.commentBody}>
            <View style={s.commentMeta}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => parentComment.authorId && router.push({ pathname: '/user-profile', params: { id: parentComment.authorId } })}
              >
                <Text style={s.authorName}>{parentComment.author}</Text>
              </TouchableOpacity>
              {parentComment.userType !== 'KOREAN' && (
                <View style={s.intlBadge}>
                  <Text style={s.intlBadgeText}>{parentComment.userType === 'EXCHANGE' ? '교환학생' : '유학생'}</Text>
                </View>
              )}
              <Text style={s.commentTime}>{formatTime(parentComment.createdAt ?? '')}</Text>
            </View>
            <Text style={s.commentContent}>
              {showTranslation[commentId] && translatedTexts[commentId] ? translatedTexts[commentId] : parentComment.content}
            </Text>
            <TouchableOpacity style={s.translateBtn} onPress={() => handleTranslate(commentId)}>
              {translating[commentId]
                ? <ActivityIndicator size="small" color={T2} />
                : <Text style={[s.translateText, { color: showTranslation[commentId] ? BLUE : T2 }]}>
                    {showTranslation[commentId] ? '원문 보기' : '번역 보기'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* 대댓글 목록 */}
        <View style={s.repliesSection}>
          <Text style={s.repliesTitle}>답글 {replies.length}개</Text>
          {loading
            ? <ActivityIndicator color={BLUE} style={{ marginTop: 20 }} />
            : replies.length === 0
              ? <Text style={s.emptyText}>첫 답글을 달아보세요!</Text>
              : replies.map((r) => (
                  <View key={r.id} style={s.replyItem}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => r.authorId && router.push({ pathname: '/user-profile', params: { id: r.authorId } })}
                    >
                      {toAbsoluteUrl(r.authorProfileImage)
                        ? <Image source={{ uri: toAbsoluteUrl(r.authorProfileImage)! }} style={s.replyAvatar} />
                        : <View style={[s.replyAvatar, { backgroundColor: avatarColor(r.author) }]}>
                            <Text style={s.replyAvatarText}>{getInitial(r.author)}</Text>
                          </View>
                      }
                    </TouchableOpacity>
                    <View style={s.commentBody}>
                      <View style={s.commentMeta}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => r.authorId && router.push({ pathname: '/user-profile', params: { id: r.authorId } })}
                        >
                          <Text style={s.authorName}>{r.author}</Text>
                        </TouchableOpacity>
                        {r.userType !== 'KOREAN' && (
                          <View style={s.intlBadge}>
                            <Text style={s.intlBadgeText}>{r.userType === 'EXCHANGE' ? '교환학생' : '유학생'}</Text>
                          </View>
                        )}
                        <Text style={s.commentTime}>{formatTime(r.createdAt)}</Text>
                        {r.author === user?.nickname && (
                          <TouchableOpacity onPress={() => handleDeleteReply(r.id)} style={s.deleteBtn}>
                            <Text style={s.deleteText}>삭제</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={s.commentContent}>
                        {showTranslation[r.id] && translatedTexts[r.id] ? translatedTexts[r.id] : r.content}
                      </Text>
                      <TouchableOpacity style={s.translateBtn} onPress={() => handleTranslate(r.id)}>
                        {translating[r.id]
                          ? <ActivityIndicator size="small" color={T2} />
                          : <Text style={[s.translateText, { color: showTranslation[r.id] ? BLUE : T2 }]}>
                              {showTranslation[r.id] ? '원문 보기' : '번역 보기'}
                            </Text>
                        }
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
          }
        </View>
      </ScrollView>

      {/* 답글 입력 바 */}
      <View style={s.inputBar}>
        {toAbsoluteUrl(user?.profileImage)
          ? <Image source={{ uri: toAbsoluteUrl(user?.profileImage)! }} style={s.replyAvatar} />
          : <View style={[s.replyAvatar, { backgroundColor: avatarColor(user?.nickname ?? '') }]}>
              <Text style={s.replyAvatarText}>{(user?.nickname ?? '?').charAt(0)}</Text>
            </View>
        }
        <TextInput
          ref={inputRef}
          style={s.input}
          placeholder="답글을 입력하세요..."
          placeholderTextColor={T2}
          value={replyText}
          onChangeText={setReplyText}
          multiline
          onFocus={() => setKavEnabled(true)}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!replyText.trim() || submitting) && s.sendBtnDisabled]}
          onPress={handleSubmit}
          disabled={!replyText.trim() || submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={16} color="#fff" />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#fff',
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: T1 },

  scrollContent: { paddingBottom: 20 },

  // 원댓글
  parentComment: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: BLUE_L,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  // 대댓글 섹션
  repliesSection: { padding: 16, gap: 16 },
  repliesTitle: { fontSize: 14, fontWeight: '700', color: T1, marginBottom: 4 },
  emptyText: { fontSize: 14, color: T2, textAlign: 'center', marginTop: 20 },

  replyItem: {
    flexDirection: 'row',
    gap: 10,
  },

  avatar: { width: 40, height: 40, borderRadius: 20, flexShrink: 0 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: 40 },
  replyAvatar: { width: 32, height: 32, borderRadius: 16, flexShrink: 0, justifyContent: 'center', alignItems: 'center' },
  replyAvatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  commentBody: { flex: 1 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  authorName: { fontSize: 13, fontWeight: '700', color: T1 },
  commentTime: { fontSize: 11, color: T2 },
  commentContent: { fontSize: 14, color: T1, lineHeight: 20 },

  intlBadge: { backgroundColor: BLUE_L, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  intlBadgeText: { fontSize: 10, fontWeight: '600', color: BLUE },

  deleteBtn: { marginLeft: 'auto' },
  deleteText: { fontSize: 10, color: '#EF4444', fontWeight: '600' },

  translateBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  translateText: { fontSize: 12, fontWeight: '600' },

  // 입력 바
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#F4F6FB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: T1,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
