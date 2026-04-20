// 커뮤니티 글 상세 화면
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getInitial } from '../utils/getInitial';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
  TextInput, KeyboardAvoidingView, Platform, Image, Keyboard, ActivityIndicator, Alert, Modal, Pressable, Dimensions, PanResponder,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { s as sc } from '../utils/scale';
import { getCommunityPost, addCommunityComment, addCommunityReply, toggleCommunityLike, updateCommunityPost, deleteCommunityPost, deleteCommunityComment, translateCommunityPost, translateCommunityComment, getCommunityReplies, getCommunityPostLikers, type CommunityPostDetailDto, type PostCommentDto } from '../services/communityService';
import { blockUser } from '../services/blockService';
import { reportContent } from '../services/reportService';
import * as Haptics from 'expo-haptics';
import { getOrCreateDirectRoom } from '../services/directChatService';
import { useAuthStore } from '../stores/authStore';
import { useCommunityStore } from '../stores/communityStore';

const BLUE    = '#3B6FE8';
const BLUE_BG = '#F5F8FF';
const BLUE_L  = '#EEF4FF';
const BORDER  = '#D0E0F8';
const T1      = '#0C1C3C';
const T2      = '#A8C8FA';
const T3      = '#6B9DF0';
const ORANGE  = '#F97316';

const CATEGORY_LABEL: Record<string, string> = {
  INFO: '자유게시판', QUESTION: '로컬게시판', CHAT: '모임게시판', CULTURE: '장터게시판',
};

const AVATAR_COLORS = ['#3B6FE8', '#6B9DF0', '#A8C8FA', '#5B8DEF', '#4A7CE0'];
const SERVER_BASE_URL = 'https://backend-production-0a6f.up.railway.app';

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


export default function CommunityPostScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [post, setPost] = useState<CommunityPostDetailDto | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [otherMenuVisible, setOtherMenuVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [translating, setTranslating] = useState(false);
  const { getTranslation, setTranslation: setStoreTranslation } = useCommunityStore();
  const translation = post ? getTranslation(post.id) : null;
  const [commentTranslations, setCommentTranslations] = useState<Record<number, string>>({});
  const [translatingComments, setTranslatingComments] = useState<Record<number, boolean>>({});
  const [likersVisible, setLikersVisible] = useState(false);
  const [likers, setLikers] = useState<{ id: number; nickname: string; profileImage?: string; university: string; major?: string; authorMajor?: string }[]>([]);
  const [likersLoading, setLikersLoading] = useState(false);
  const [commentLikes, setCommentLikes] = useState<Record<number, boolean>>({});
  const [commentLikeCounts, setCommentLikeCounts] = useState<Record<number, number>>({});
  const [pressingCommentId, setPressingCommentId] = useState<number | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [replyTarget, setReplyTarget] = useState<{ commentId: number; author: string } | null>(null);
  const inputRef = useRef<any>(null);
  const commentYMap = useRef<Record<number, number>>({});
  const commentSectionY = useRef<number>(0);
  const keyboardHeightRef = useRef<number>(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const pendingScrollCommentId = useRef<number | null>(null);
  const commentItemRefs = useRef<Record<number, any>>({});
  const currentScrollY = useRef<number>(0);


  const REPORT_REASONS = ['스팸/광고', '욕설/혐오 표현', '부적절한 내용', '사기/허위 정보', '기타'];

  const reportPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10,
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 10 || gs.vy > 0.3) {
        setReportVisible(false);
        setReportReason('');
      }
    },
  })).current;

  const handleReport = async () => {
    if (!reportReason) { Alert.alert('신고 사유를 선택해주세요.'); return; }
    if (!post?.authorId) return;
    try {
      await reportContent({ targetUserId: post.authorId, targetType: 'POST', targetId: post.id, reason: reportReason });
      setReportVisible(false);
      setReportReason('');
      Alert.alert('신고 완료', '신고가 접수되었습니다. 검토 후 조치하겠습니다.');
    } catch {
      Alert.alert('오류', '신고에 실패했습니다.');
    }
  };

  const handlePanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_e, gs) => gs.dy > 10,
    onPanResponderRelease: (_e, gs) => {
      if (gs.dy > 10 || gs.vy > 0.3) {
        setLikersVisible(false);
      }
    },
  }), []);

  const openLikers = async () => {
    if (!post) return;
    setLikersVisible(true);
    setLikersLoading(true);
    try {
      const res = await getCommunityPostLikers(post.id);
      if (res.success) {
        const data = Array.isArray(res.data) ? res.data : (res.data as any)?.content ?? [];
        setLikers(data);
      }
    } catch {}
    finally { setLikersLoading(false); }
  };

  const [expandedReplies, setExpandedReplies] = useState<Record<number, PostCommentDto[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<number, boolean>>({});

  const toggleReplies = async (commentId: number) => {
    if (expandedReplies[commentId]) {
      setExpandedReplies((prev) => { const n = { ...prev }; delete n[commentId]; return n; });
      return;
    }
    setLoadingReplies((prev) => ({ ...prev, [commentId]: true }));
    try {
      const res = await getCommunityReplies(commentId);
      if (res.success) setExpandedReplies((prev) => ({ ...prev, [commentId]: res.data }));
    } catch {}
    finally { setLoadingReplies((prev) => ({ ...prev, [commentId]: false })); }
  };
  const scrollRef = useRef<ScrollView>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardHeightRef.current = e.endCoordinates.height;
        setKeyboardHeight(e.endCoordinates.height);
        const targetId = pendingScrollCommentId.current;
        pendingScrollCommentId.current = null;
        if (targetId !== null && scrollRef.current) {
          const itemRef = commentItemRefs.current[targetId];
          if (!itemRef) return;
          const kbHeight = e.endCoordinates.height;
          const screenHeight = Dimensions.get('window').height;
          const inputBarHeight = sc(60);
          const visibleTop = sc(80);
          const visibleBottom = screenHeight - kbHeight - inputBarHeight;
          const MARGIN = sc(12);
          // paddingBottom 업데이트 후 레이아웃 반영 대기
          setTimeout(() => {
            itemRef.measure((_x: number, _y: number, _w: number, _h: number, _px: number, itemPageY: number) => {
              const itemBottom = itemPageY + _h;
              if (itemBottom > visibleBottom - MARGIN) {
                const overlapAmount = itemBottom - visibleBottom + MARGIN;
                scrollRef.current?.scrollTo({ y: currentScrollY.current + overlapAmount, animated: true });
              } else {
                const targetPageY = visibleBottom - _h - MARGIN;
                const diff = itemPageY - targetPageY;
                if (diff < -MARGIN) {
                  scrollRef.current?.scrollTo({ y: currentScrollY.current + diff, animated: true });
                }
              }
            });
          }, 50);
        }
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => { keyboardHeightRef.current = 0; setKeyboardHeight(0); },
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  const fetchPost = useCallback(async () => {
    try {
      const res = await getCommunityPost(Number(id));
      if (res.success && res.data) {
        setPost(res.data);
        setIsLiked(res.data.liked);
        // likers 미리보기용 사전 로드
        try {
          const lr = await getCommunityPostLikers(res.data.id);
          if (lr.success) {
            const data = Array.isArray(lr.data) ? lr.data : (lr.data as any)?.content ?? [];
            setLikers(data);
          }
        } catch {}
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { fetchPost(); }, [fetchPost]));

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
  const isOwnPost = post.author === user?.nickname;

  const handleEdit = () => {
    setMenuVisible(false);
    router.push({
      pathname: '/community-write',
      params: { id: String(post.id), category: post.category, title: post.title, content: post.content },
    });
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert('삭제 확인', '게시글을 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCommunityPost(post.id);
            router.back();
          } catch {
            Alert.alert('오류', '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleDeleteComment = (commentId: number) => {
    Alert.alert('댓글 삭제', '댓글을 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCommunityComment(commentId);
            setPost((prev) => prev ? {
              ...prev,
              comments: prev.comments - 1,
              commentList: prev.commentList.filter((c) => c.id !== commentId),
            } : prev);
          } catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? '삭제에 실패했습니다.';
            Alert.alert('오류', msg);
          }
        },
      },
    ]);
  };

  const handleTranslate = async () => {
    if (translation) { setStoreTranslation(post!.id, null); return; }
    setTranslating(true);
    try {
      const res = await translateCommunityPost(post!.id);
      if (res.success && res.data) {
        setStoreTranslation(post!.id, res.data);
      } else {
        Alert.alert('번역 실패', res.message ?? '번역에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch {
      Alert.alert('번역 실패', '번역 서버에 연결할 수 없습니다.');
    } finally {
      setTranslating(false);
    }
  };

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

  const handleTranslateComment = async (commentId: number) => {
    if (commentTranslations[commentId] !== undefined) {
      setCommentTranslations((prev) => { const next = { ...prev }; delete next[commentId]; return next; });
      return;
    }
    setTranslatingComments((prev) => ({ ...prev, [commentId]: true }));
    try {
      const res = await translateCommunityComment(commentId);
      if (res.success && res.data) {
        setCommentTranslations((prev) => ({ ...prev, [commentId]: res.data.content }));
      } else {
        Alert.alert('번역 실패', res.message ?? '번역에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch {
      Alert.alert('번역 실패', '번역 서버에 연결할 수 없습니다.');
    } finally {
      setTranslatingComments((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    try {
      if (replyTarget) {
        const res = await addCommunityReply(replyTarget.commentId, text);
        if (res.success && res.data) {
          setExpandedReplies((prev) => ({
            ...prev,
            [replyTarget.commentId]: [...(prev[replyTarget.commentId] ?? []), res.data],
          }));
          setPost((prev) => prev ? {
            ...prev,
            commentList: prev.commentList.map((c) =>
              c.id === replyTarget.commentId ? { ...c, replyCount: (c.replyCount ?? 0) + 1 } : c
            ),
          } : prev);
        }
        setReplyTarget(null);
      } else {
        const res = await addCommunityComment(post.id, text);
        if (res.success && res.data) {
          setPost((prev) => prev ? {
            ...prev,
            comments: prev.comments + 1,
            commentList: [...(prev.commentList ?? []), res.data],
          } : prev);
        }
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
    >
      {/* 뒤로가기 버튼 - 항상 고정 */}
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color={T1} />
      </TouchableOpacity>

      {/* 우상단 버튼 */}
      <View style={s.moreBtnWrap}>
        {isOwnPost ? (
          <>
            <TouchableOpacity style={s.moreBtn} onPress={() => setMenuVisible(true)}>
              <Ionicons name="ellipsis-vertical" size={20} color={T1} />
            </TouchableOpacity>
            <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
              <Pressable style={s.menuOverlay} onPress={() => setMenuVisible(false)}>
                <View style={s.menuSheet}>
                  <TouchableOpacity style={s.menuItem} onPress={handleEdit}>
                    <Ionicons name="pencil-outline" size={18} color={T1} />
                    <Text style={s.menuItemText}>수정</Text>
                  </TouchableOpacity>
                  <View style={s.menuDivider} />
                  <TouchableOpacity style={s.menuItem} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={[s.menuItemText, { color: '#EF4444' }]}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Modal>
          </>
        ) : post.author !== '(알 수 없음)' ? (
          <>
            <TouchableOpacity style={s.moreBtn} onPress={() => setOtherMenuVisible(true)}>
              <Ionicons name="ellipsis-vertical" size={20} color={T1} />
            </TouchableOpacity>
            <Modal visible={otherMenuVisible} transparent animationType="fade" onRequestClose={() => setOtherMenuVisible(false)}>
              <Pressable style={s.menuOverlay} onPress={() => setOtherMenuVisible(false)}>
                <View style={s.menuSheet}>
                  <TouchableOpacity style={s.menuItem} onPress={() => {
                    setOtherMenuVisible(false);
                    if (!post.authorId) return;
                    Alert.alert(
                      '차단하기',
                      `${post.author}님을 차단하시겠어요?\n차단한 사용자의 글과 메시지가 보이지 않습니다.`,
                      [
                        { text: '취소', style: 'cancel' },
                        {
                          text: '차단', style: 'destructive',
                          onPress: async () => {
                            try {
                              await blockUser(post.authorId!);
                              router.back();
                            } catch {
                              Alert.alert('오류', '차단에 실패했습니다.');
                            }
                          },
                        },
                      ]
                    );
                  }}>
                    <Ionicons name="ban-outline" size={18} color="#EF4444" />
                    <Text style={[s.menuItemText, { color: '#EF4444' }]}>차단하기</Text>
                  </TouchableOpacity>
                  <View style={s.menuDivider} />
                  <TouchableOpacity style={s.menuItem} onPress={() => {
                    setReportVisible(true);
                    setOtherMenuVisible(false);
                  }}>
                    <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                    <Text style={[s.menuItemText, { color: '#EF4444' }]}>신고하기</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Modal>
          </>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => { currentScrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: sc(20) + keyboardHeight + sc(60), paddingTop: Platform.OS === 'ios' ? 110 : 80 }}
      >
        <View style={s.postWrap}>
          {/* 카테고리 텍스트 */}
          <Text style={s.catLabel}>{CATEGORY_LABEL[post.category]} 게시글</Text>

          {/* 작성자 정보 */}
          <TouchableOpacity
            style={s.authorRow}
            activeOpacity={post.authorId === user?.id ? 1 : 0.8}
            onPress={() => post.authorId !== user?.id && post.authorId && post.author !== '(알 수 없음)' && router.push({ pathname: '/user-profile', params: { id: post.authorId } })}
          >
            {toAbsoluteUrl(post.authorProfileImage)
              ? <Image source={{ uri: toAbsoluteUrl(post.authorProfileImage)! }} style={s.avatar} />
              : <View style={[s.avatar, { backgroundColor: avatarColor(post.author) }]}>
                  <Text style={s.avatarText}>{getInitial(post.author)}</Text>
                </View>
            }
            <View style={{ flex: 1, gap: sc(5) }}>
              <Text style={s.authorName}>{post.author}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: sc(12) }}>
                <Text style={s.authorSub}>{post.authorMajor || post.university}</Text>
                <Text style={s.postTime}>{formatTime(post.createdAt)}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* 본문 */}
          <Text style={s.postContent}>{translation ? translation.content : post.content}</Text>

          {/* 이미지 */}
          {post.images.length > 0 && (
            <View style={s.imageScroll}>
              {post.images.map((uri, idx) => (
                <TouchableOpacity key={idx} activeOpacity={0.9} onPress={() => setFullscreenImage(uri)}>
                  <Image source={{ uri }} style={s.image} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 좋아요 / 댓글 수 / 번역 버튼 */}
          <View style={s.reactionBar}>
            <View style={s.reactionBtns}>
              <TouchableOpacity style={s.reactionBtn} onPress={handleLike} activeOpacity={0.8}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isLiked ? '#EF4444' : '#5B8DEF'}
                />
                <Text style={[s.reactionCount, isLiked && s.reactionCountLiked]}>{post.likes}</Text>
              </TouchableOpacity>
              <View style={s.reactionBtn}>
                <Ionicons name="chatbubble-outline" size={20} color="#5B8DEF" />
                <Text style={s.reactionCount}>{comments.length}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.reactionBtn, translation && s.translateBtnActive]}
              onPress={handleTranslate}
              activeOpacity={0.8}
              disabled={translating}
            >
              {translating
                ? <ActivityIndicator size="small" color={BLUE} />
                : <Ionicons name="language-outline" size={20} color={translation ? '#fff' : '#5B8DEF'} />
              }
            </TouchableOpacity>
          </View>

          {/* 좋아요 누른 사람 미리보기 */}
          {post.likes > 0 && (
            <TouchableOpacity style={s.likersPreviewRow} onPress={openLikers} activeOpacity={0.8}>
              <View style={s.likersAvatarGroup}>
                {likers.slice(0, 5).map((liker, idx) => (
                  <View key={liker.id} style={[s.likersPreviewAvatar, { marginLeft: idx === 0 ? 0 : -sc(10), zIndex: 5 - idx }]}>
                    {liker.profileImage
                      ? <Image source={{ uri: toAbsoluteUrl(liker.profileImage)! }} style={s.likersPreviewImg} />
                      : <View style={[s.likersPreviewImg, { backgroundColor: avatarColor(liker.nickname), justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={{ fontSize: sc(10), color: '#fff', fontWeight: '700' }}>{getInitial(liker.nickname)}</Text>
                        </View>
                    }
                  </View>
                ))}
              </View>
              <Ionicons name="chevron-forward" size={sc(14)} color={T2} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          )}
        </View>

        {/* 댓글 목록 */}
        <View style={s.commentSection} onLayout={(e) => { commentSectionY.current = e.nativeEvent.layout.y; }}>
          <Text style={s.commentSectionTitle}>댓글 ({comments.length})</Text>
          {comments.length === 0 ? (
            <View style={s.noComment}>
              <Text style={s.noCommentText}>첫 댓글을 달아보세요!</Text>
            </View>
          ) : (
            <>
              {comments.map((c) => {
                const isOwn = c.authorId === user?.id;

                return (
                <React.Fragment key={c.id}>
                <Pressable
                  onPressIn={isOwn ? () => {
                    pressTimerRef.current = setTimeout(() => setPressingCommentId(c.id), 200);
                  } : undefined}
                  onPressOut={() => {
                    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
                    setPressingCommentId(null);
                  }}
                  onPress={() => {
                    if (replyTarget) {
                      setReplyTarget(null);
                      setCommentText('');
                      Keyboard.dismiss();
                      return;
                    }
                    setReplyTarget({ commentId: c.id, author: c.author });
                    setCommentText(`@${c.author} `);
                    pendingScrollCommentId.current = c.id;
                    inputRef.current?.focus();
                  }}
                  onLongPress={isOwn ? () => { setPressingCommentId(null); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); handleDeleteComment(c.id); } : undefined}
                  delayLongPress={800}
                  style={{ position: 'relative' }}
                  onLayout={(e) => { commentYMap.current[c.id] = e.nativeEvent.layout.y; }}
                >
                <View
                  ref={(r) => { commentItemRefs.current[c.id] = r; }}
                  style={s.commentItem}
                >
                  {pressingCommentId === c.id && (
                    <View style={{ position: 'absolute', top: 0, bottom: 0, left: -sc(16), right: -sc(16), backgroundColor: '#EEF4FF' }} />
                  )}
                  <TouchableOpacity
                    activeOpacity={isOwn ? 1 : 0.8}
                    onPress={() => !isOwn && c.authorId && c.author !== '(알 수 없음)' && router.push({ pathname: '/user-profile', params: { id: c.authorId } })}
                  >
                    {toAbsoluteUrl(c.authorProfileImage)
                      ? <Image source={{ uri: toAbsoluteUrl(c.authorProfileImage)! }} style={s.commentAvatar} />
                      : <View style={[s.commentAvatar, { backgroundColor: avatarColor(c.author) }]}>
                          <Text style={s.commentAvatarText}>{getInitial(c.author)}</Text>
                        </View>
                    }
                  </TouchableOpacity>
                  <View style={s.commentBody}>
                    <View style={s.commentMeta}>
                      <TouchableOpacity
                        activeOpacity={isOwn ? 1 : 0.8}
                        onPress={() => !isOwn && c.authorId && c.author !== '(알 수 없음)' && router.push({ pathname: '/user-profile', params: { id: c.authorId } })}
                      >
                        <Text style={s.commentAuthor}>{c.author}</Text>
                      </TouchableOpacity>
                      <Text style={s.commentTime}>{formatTime(c.createdAt)}</Text>
                      <TouchableOpacity
                        style={s.commentHeartBtn}
                        onPress={() => {
                          const liked = !commentLikes[c.id];
                          setCommentLikes(prev => ({ ...prev, [c.id]: liked }));
                          setCommentLikeCounts(prev => ({ ...prev, [c.id]: (prev[c.id] ?? 0) + (liked ? 1 : -1) }));
                        }}
                      >
                        <View style={{ alignItems: 'center' }}>
                          <Ionicons
                            name={commentLikes[c.id] ? 'heart' : 'heart-outline'}
                            size={sc(18)}
                            color={commentLikes[c.id] ? '#EF4444' : '#5B8DEF'}
                          />
                          {(commentLikeCounts[c.id] ?? 0) > 0 && (
                            <Text style={{ fontSize: sc(9), color: commentLikes[c.id] ? '#EF4444' : '#5B8DEF', fontWeight: '700', position: 'absolute', top: sc(18) }}>
                              {commentLikeCounts[c.id]}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                    <Text style={s.commentContent}>
                      {commentTranslations[c.id] !== undefined ? commentTranslations[c.id] : c.content}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity
                        style={s.commentTranslateBtn}
                        onPress={() => handleTranslateComment(c.id)}
                        disabled={translatingComments[c.id]}
                      >
                        {translatingComments[c.id]
                          ? <ActivityIndicator size="small" color={BLUE} />
                          : <Text style={[s.commentTranslateText, commentTranslations[c.id] !== undefined && s.commentTranslateTextActive]}>
                              {commentTranslations[c.id] !== undefined ? '원문 보기' : '번역 보기'}
                            </Text>
                        }
                      </TouchableOpacity>
                      {(c.replyCount ?? 0) > 0 && (
                        <TouchableOpacity onPress={() => toggleReplies(c.id)} style={s.replyToggleBtn}>
                          {loadingReplies[c.id]
                            ? <ActivityIndicator size="small" color={BLUE} />
                            : <Text style={s.replyToggleText}>
                                {expandedReplies[c.id] ? '답글 숨기기' : `답글 ${c.replyCount}개 더 보기`}
                              </Text>
                          }
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>

                {/* 펼쳐진 답글 목록 */}
                {expandedReplies[c.id]?.map((r) => (
                  <View key={r.id} style={s.replyItem}>
                    {toAbsoluteUrl(r.authorProfileImage)
                      ? <Image source={{ uri: toAbsoluteUrl(r.authorProfileImage)! }} style={s.commentAvatar} />
                      : <View style={[s.commentAvatar, { backgroundColor: avatarColor(r.author) }]}>
                          <Text style={s.commentAvatarText}>{getInitial(r.author)}</Text>
                        </View>
                    }
                    <View style={s.commentBody}>
                      <View style={s.commentMeta}>
                        <Text style={s.commentAuthor}>{r.author}</Text>
                        <Text style={s.commentTime}>{formatTime(r.createdAt)}</Text>
                      </View>
                      <Text style={s.commentContent}>{r.content}</Text>
                    </View>
                  </View>
                ))}
                </Pressable>
                <View style={s.commentDivider} />
                </React.Fragment>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      {/* 좋아요 누른 사람 모달 */}
      <Modal visible={likersVisible} transparent animationType="slide" onRequestClose={() => setLikersVisible(false)}>
        <Pressable style={s.likersOverlay} onPress={() => setLikersVisible(false)}>
          <View style={s.likersSheet}>
            <View style={s.likersHandleWrap} {...handlePanResponder.panHandlers}>
              <View style={s.likersHandle} />
            </View>
            <Text style={s.likersTitle}>좋아요 {post?.likes ?? 0}개</Text>
            <View style={s.likersDivider} />
            {likersLoading
              ? <ActivityIndicator color={BLUE} style={{ marginTop: sc(30) }} />
              : <FlatList
                  data={likers}
                  keyExtractor={(item) => item.id.toString()}
                  bounces={true}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={s.likerItem}
                      activeOpacity={0.8}
                      onPress={() => { setLikersVisible(false); router.push({ pathname: '/user-profile', params: { id: item.id } }); }}
                    >
                      <View style={[s.likerAvatar, { backgroundColor: avatarColor(item.nickname) }]}>
                        {item.profileImage
                          ? <Image source={{ uri: toAbsoluteUrl(item.profileImage)! }} style={s.likerAvatarImg} />
                          : <Text style={s.likerAvatarText}>{getInitial(item.nickname)}</Text>
                        }
                      </View>
                      <View>
                        <Text style={s.likerName}>{item.nickname}</Text>
                        {(item.major || item.authorMajor || item.university)
                          ? <Text style={s.likerUniv}>{item.major ?? item.authorMajor ?? item.university}</Text>
                          : null}
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={s.likersEmpty}>아직 좋아요가 없습니다</Text>}
                />
            }
          </View>
        </Pressable>
      </Modal>

      {/* 신고 모달 */}
      <Modal visible={reportVisible} transparent animationType="slide" onRequestClose={() => { setReportVisible(false); setReportReason(''); }}>
        <TouchableOpacity style={s.reportOverlay} activeOpacity={1} onPress={() => { setReportVisible(false); setReportReason(''); }}>
          <TouchableOpacity style={s.reportSheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.reportHandleWrap} {...reportPanResponder.panHandlers}>
              <View style={s.reportHandle} />
            </View>
            <Text style={s.reportTitle}>신고하기</Text>
            <View style={s.reportDivider} />
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity key={reason} style={s.reportItem} activeOpacity={0.7} onPress={() => setReportReason(reason)}>
                <View style={[s.reportRadio, reportReason === reason && s.reportRadioOn]}>
                  {reportReason === reason && <View style={s.reportRadioDot} />}
                </View>
                <Text style={[s.reportItemText, reportReason === reason && s.reportItemTextOn]}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <View style={s.reportDivider} />
            <View style={s.reportBtnRow}>
              <TouchableOpacity style={s.reportCancelBtn} onPress={() => { setReportVisible(false); setReportReason(''); }}>
                <Text style={s.reportCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.reportSubmitBtn, !reportReason && s.reportSubmitBtnOff]} onPress={handleReport}>
                <Text style={s.reportSubmitText}>신고하기</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 풀스크린 이미지 뷰어 */}
      <Modal visible={!!fullscreenImage} transparent animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
        <View style={s.fsOverlay}>
          <Image source={{ uri: fullscreenImage ?? '' }} style={s.fsImage} resizeMode="contain" />
          <TouchableOpacity style={s.fsClose} onPress={() => setFullscreenImage(null)} activeOpacity={0.8}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* 댓글 입력 바 */}
      <View style={[s.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom * 0.7 : sc(10) }]}>
        <TextInput
          ref={inputRef}
          style={s.commentInput}
          placeholder={replyTarget ? `@${replyTarget.author}에게 답글...` : ''}
          placeholderTextColor={T2}
          value={commentText}
          onChangeText={(t) => { setCommentText(t); if (!t) setReplyTarget(null); }}
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
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BLUE_BG },

  // 헤더
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 66 : 38,
    left: sc(16),
    zIndex: 20,
    width: sc(36), height: sc(36), borderRadius: sc(18),
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  moreBtnWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 66 : 38,
    right: sc(16),
    zIndex: 20,
    flexDirection: 'row',
    gap: sc(8),
  },

  scroll: { flex: 1 },

  // 게시글 본문
  postWrap: {
    backgroundColor: '#fff',
    padding: sc(18),
    paddingBottom: sc(6),
    borderBottomWidth: sc(1),
    borderBottomColor: BORDER,
    position: 'relative',
  },
  catLabel: {
    fontSize: sc(20), fontWeight: '800', color: T1,
    textAlign: 'center', marginBottom: sc(40), marginTop: -sc(55),
  },
  catBadge: {
    paddingHorizontal: sc(10), paddingVertical: sc(3),
    backgroundColor: BLUE_L, borderRadius: sc(8),
  },
  catBadgeText: { fontSize: sc(13), fontWeight: '800', color: BLUE },
  intlBadge: {
    paddingHorizontal: sc(10), paddingVertical: sc(3),
    backgroundColor: '#FFF0E6', borderRadius: sc(8),
  },
  intlBadgeText: { fontSize: sc(11), fontWeight: '800', color: '#C45A10' },

  postTitle: { fontSize: sc(18), fontWeight: '900', color: T1, lineHeight: sc(26), marginTop: sc(4), marginBottom: sc(8), letterSpacing: -0.4 },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: sc(10), marginBottom: sc(4) },
  avatar: {
    width: sc(54), height: sc(54), borderRadius: sc(27),
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#A8C8FA',
  },
  avatarText: { fontSize: sc(18), fontWeight: '700', color: '#fff' },
  authorName: { fontSize: sc(16), fontWeight: '700', color: T1 },
  authorSub: { fontSize: sc(13), color: '#5B8DEF', fontWeight: '600' },

  postContent: { fontSize: sc(16), color: T1, lineHeight: sc(25), marginBottom: sc(8) },

  imageScroll: { marginBottom: sc(16), flexDirection: 'row', flexWrap: 'wrap', gap: sc(8) },
  image: { width: sc(160), height: sc(160), borderRadius: sc(12), marginRight: sc(8) },

  reactionBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: sc(8),
  },
  reactionBtns: { flexDirection: 'row', gap: sc(16), alignItems: 'center' },
  postTime: { fontSize: sc(14), color: '#5B8DEF', fontWeight: '600' },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: sc(5) },
  reactionCount: { fontSize: sc(16), color: '#5B8DEF', fontWeight: '700' },
  reactionCountLiked: { color: '#EF4444' },
  translateBtnActive: { backgroundColor: BLUE, borderRadius: sc(14), paddingHorizontal: sc(6) },

  // 좋아요 미리보기
  likersPreviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: sc(8),
    paddingTop: sc(6), borderTopWidth: 1, borderTopColor: BORDER, marginTop: sc(4),
    paddingBottom: 0,
  },
  likersAvatarGroup: { flexDirection: 'row', alignItems: 'center' },
  likersPreviewAvatar: { width: sc(28), height: sc(28), borderRadius: sc(14), borderWidth: 1.5, borderColor: '#fff', overflow: 'hidden' },
  likersPreviewImg: { width: sc(28), height: sc(28), borderRadius: sc(14) },
  likersPreviewText: { marginLeft: 'auto', fontSize: sc(13), fontWeight: '700', color: T1 },

  // 댓글 섹션
  commentSection: { backgroundColor: '#fff', padding: sc(16) },
  commentSectionTitle: { fontSize: sc(17), fontWeight: '800', color: T1, marginBottom: sc(14) },
  noComment: { paddingVertical: sc(24), alignItems: 'center' },
  noCommentText: { fontSize: sc(13), color: T2 },

  commentItem: {
    flexDirection: 'row', gap: sc(10),
    paddingVertical: sc(14),
  },
  commentAvatar: {
    width: sc(38), height: sc(38), borderRadius: sc(19),
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  commentAvatarText: { fontSize: sc(14), fontWeight: '700', color: '#fff' },
  commentBody: { flex: 1 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: sc(6), marginBottom: sc(4) },
  commentAuthor: { fontSize: sc(14), fontWeight: '700', color: T1 },
  commentIntlBadge: {
    paddingHorizontal: sc(6), paddingVertical: sc(1),
    backgroundColor: '#FFF0E6', borderRadius: sc(5),
  },
  commentIntlBadgeText: { fontSize: sc(9), fontWeight: '800', color: '#C45A10' },
  commentTime: { fontSize: sc(10), color: '#6B7280', fontWeight: '600' },
  commentDeleteBtn: { marginLeft: 'auto' },
  commentDeleteText: { fontSize: sc(10), color: '#EF4444', fontWeight: '600' },
  replyCountText: { fontSize: sc(12), color: BLUE, fontWeight: '600' },
  commentHeartBtn: { marginLeft: 'auto', alignItems: 'center', width: sc(20) },

  likersOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
  likersSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: sc(36), borderTopRightRadius: sc(36),
    paddingHorizontal: sc(16), paddingBottom: sc(40), height: '50%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -sc(6) }, shadowOpacity: 0.12, shadowRadius: sc(16), elevation: 20,
  },
  likersHandleWrap: {
    width: '100%', paddingVertical: sc(14), alignItems: 'center',
  },
  likersHandle: {
    width: sc(36), height: sc(4), borderRadius: sc(2), backgroundColor: '#D1D5DB',
  },
  likersTitle: { fontSize: sc(19), fontWeight: '800', color: T1, marginBottom: sc(12), marginLeft: sc(8) },
  likersDivider: { height: 1, backgroundColor: BORDER, marginBottom: sc(4) },
  likersEmpty: { textAlign: 'center', color: T2, paddingVertical: sc(30), fontSize: sc(14) },
  likerItem: { flexDirection: 'row', alignItems: 'center', gap: sc(12), paddingVertical: sc(10) },
  likerAvatar: {
    width: sc(42), height: sc(42), borderRadius: sc(21),
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  likerAvatarImg: { width: sc(42), height: sc(42), borderRadius: sc(21) },
  likerAvatarText: { fontSize: sc(16), fontWeight: '700', color: '#fff' },
  likerName: { fontSize: sc(14), fontWeight: '700', color: T1 },
  likerUniv: { fontSize: sc(12), color: '#5B8DEF', marginTop: sc(2) },

  commentDivider: { height: 1, backgroundColor: '#F0F0F0' },
  replyToggleBtn: { paddingVertical: sc(2) },
  replyToggleText: { fontSize: sc(12), color: BLUE, fontWeight: '700' },
  replyItem: {
    flexDirection: 'row', gap: sc(10),
    paddingLeft: sc(46), paddingVertical: sc(8),
    paddingRight: sc(16),
    marginLeft: sc(16),
  },
  commentContent: { fontSize: sc(14), color: T1, lineHeight: sc(21) },
  commentTranslateBtn: { marginTop: sc(4), alignSelf: 'flex-start' },
  commentTranslateText: { fontSize: sc(11), color: T2, fontWeight: '600' },
  commentTranslateTextActive: { color: BLUE },
  moreBtn: {
    width: sc(36), height: sc(36), borderRadius: sc(18),
    backgroundColor: BLUE_L, justifyContent: 'center', alignItems: 'center',
  },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  menuSheet: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 78,
    right: sc(16),
    backgroundColor: '#fff',
    borderRadius: sc(12), borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(4) },
    shadowOpacity: 0.12, shadowRadius: sc(12), elevation: 8,
    minWidth: sc(130), overflow: 'hidden',
  },
  menuBox: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 116 : 84,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: sc(12), borderWidth: sc(1), borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(4) },
    shadowOpacity: 0.12, shadowRadius: sc(12), elevation: 8,
    minWidth: sc(130), overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: sc(10), paddingHorizontal: sc(16), paddingVertical: sc(14) },
  menuItemText: { fontSize: sc(14), fontWeight: '600', color: T1 },
  menuDivider: { height: sc(1), backgroundColor: BORDER },

  // 댓글 입력바
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: sc(8),
    backgroundColor: '#fff',
    paddingHorizontal: sc(14), paddingVertical: sc(10),
    borderTopLeftRadius: sc(20), borderTopRightRadius: sc(20),
    shadowColor: '#000', shadowOffset: { width: 0, height: -sc(4) }, shadowOpacity: 0.08, shadowRadius: sc(12), elevation: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: BLUE_BG,
    borderRadius: sc(22), borderWidth: sc(1), borderColor: BORDER,
    paddingHorizontal: sc(16), paddingVertical: sc(10),
    fontSize: sc(15), color: T1, maxHeight: sc(100),
  },
  sendBtn: {
    width: sc(40), height: sc(40), borderRadius: sc(20),
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: BLUE_L },

  // 풀스크린 이미지
  fsOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  fsImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  fsClose: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 36, right: 16,
    width: sc(36), height: sc(36), borderRadius: sc(18),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  // 없는 게시글
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: sc(12) },
  notFoundText: { fontSize: sc(16), color: T1, fontWeight: '700' },
  backLink: { fontSize: sc(14), color: BLUE, fontWeight: '700' },

  // 신고 모달
  reportOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
  reportSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: sc(32),
    borderTopRightRadius: sc(32),
    paddingHorizontal: sc(20),
    paddingBottom: Platform.OS === 'ios' ? sc(40) : sc(24),
    paddingTop: sc(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  reportHandleWrap: { alignItems: 'center', paddingVertical: sc(8), marginHorizontal: -sc(20) },
  reportHandle: { width: sc(40), height: sc(4), borderRadius: sc(2), backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: sc(16) },
  reportTitle: { fontSize: sc(18), fontWeight: '900', color: T1, marginBottom: sc(4) },
  reportDivider: { height: 1, backgroundColor: BORDER, marginVertical: sc(12) },
  reportItem: { flexDirection: 'row', alignItems: 'center', gap: sc(12), paddingVertical: sc(12) },
  reportRadio: { width: sc(22), height: sc(22), borderRadius: sc(11), borderWidth: sc(2), borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  reportRadioOn: { borderColor: BLUE },
  reportRadioDot: { width: sc(10), height: sc(10), borderRadius: sc(5), backgroundColor: BLUE },
  reportItemText: { fontSize: sc(15), color: T1, fontWeight: '500' },
  reportItemTextOn: { color: BLUE, fontWeight: '700' },
  reportBtnRow: { flexDirection: 'row', gap: sc(10), marginTop: sc(4) },
  reportCancelBtn: { flex: 1, height: sc(50), borderRadius: sc(14), borderWidth: sc(1.5), borderColor: BORDER, justifyContent: 'center', alignItems: 'center' },
  reportCancelText: { fontSize: sc(15), fontWeight: '700', color: T2 },
  reportSubmitBtn: { flex: 1, height: sc(50), borderRadius: sc(14), backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center' },
  reportSubmitBtnOff: { backgroundColor: '#F3F4F6' },
  reportSubmitText: { fontSize: sc(15), fontWeight: '800', color: '#fff' },
});
