// 도움 요청 상세 화면 (홈화면 무드 통일 리디자인)
import { useState, useEffect, useRef } from 'react';
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
  Modal,
  StatusBar,
  Dimensions,
  PanResponder,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { s } from '../utils/scale';
import { CategoryLabels } from '../constants/colors';
import { getHelpRequestById, acceptHelpRequest, cancelHelpRequest, recommendHelpers } from '../services/helpService';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from 'react-i18next';
import type { HelpCategory, HelpMethod, HelpRequest, HelperRecommendResponse } from '../types';

const CategoryEmoji: Record<HelpCategory, string> = {
  BANK: '🏦', HOSPITAL: '🏥', SCHOOL: '🏫', DAILY: '🏠', OTHER: '📌',
};

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

const CATEGORY_ICON: Record<HelpCategory, { name: React.ComponentProps<typeof Ionicons>['name'] }> = {
  BANK:     { name: 'business-outline'                   },
  HOSPITAL: { name: 'medkit-outline'                     },
  SCHOOL:   { name: 'book-outline'                       },
  DAILY:    { name: 'home-outline'                       },
  OTHER:    { name: 'ellipsis-horizontal-circle-outline' },
};
const CATEGORY_BG: Record<HelpCategory, string> = {
  BANK: '#FEF3C7', HOSPITAL: '#FEE2E2', SCHOOL: '#EDE9FE', DAILY: '#D1FAE5', OTHER: '#F3F4F6',
};
const CATEGORY_COLOR: Record<HelpCategory, string> = {
  BANK: '#D97706', HOSPITAL: '#DC2626', SCHOOL: '#7C3AED', DAILY: '#059669', OTHER: '#6B7280',
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

type TFunction = (key: string, opts?: Record<string, unknown>) => string;

function formatTime(createdAt: string, t: TFunction): string {
  const date = new Date(createdAt.includes('Z') || createdAt.includes('+') ? createdAt : createdAt + 'Z');
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { m: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', { h: hours });
  return t('time.daysAgo', { d: Math.floor(hours / 24) });
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
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [item, setItem] = useState<HelpRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [recommendedHelpers, setRecommendedHelpers] = useState<HelperRecommendResponse[]>([]);
  const [isLoadingRecommend, setIsLoadingRecommend] = useState(false);
  const reportPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10,
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 10 || gs.vy > 0.3) {
        setReportVisible(false);
      }
    },
  })).current;

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await getHelpRequestById(Number(id));
        if (response.success) setItem(response.data);
      } catch {
        Alert.alert(t('common.error'), t('errors.serverError'));
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [id]);

  useEffect(() => {
    if (!item || user?.id !== item.requester.id || item.status !== 'WAITING') return;
    const fetchRecommended = async () => {
      setIsLoadingRecommend(true);
      try {
        const res = await recommendHelpers(item.id);
        if (res.success) setRecommendedHelpers(res.data);
      } catch {
        // 추천 실패 시 조용히 무시
      } finally {
        setIsLoadingRecommend(false);
      }
    };
    fetchRecommended();
  }, [item?.id, user?.id, item?.status]);

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
        <Text style={styles.errorText}>{t('community.postNotFound')}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorBack}>{t('common.back')}</Text>
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
    Alert.alert(t('requestDetail.deleteTitle'), t('requestDetail.deleteMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await cancelHelpRequest(item.id);
            if (response.success) {
              Alert.alert(t('requestDetail.deleteDone'), t('requestDetail.deleteDoneMsg'), [
                { text: t('common.confirm'), onPress: () => router.back() },
              ]);
            } else {
              Alert.alert(t('common.error'), response.message);
            }
          } catch {
            Alert.alert(t('common.error'), t('errors.serverError'));
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
        editImages: meta['사진'] ?? '',
      },
    });
  };

  const goToChatRoom = () => {
    const isKorean = user?.userType === 'KOREAN';
    const partnerUserId = isKorean ? item.requester.id : (item.helper?.id ?? item.requester.id);
    const partnerPreferredLanguage = isKorean
      ? (item.requester.preferredLanguage ?? 'en')
      : (item.helper?.preferredLanguage ?? 'en');
    router.push({
      pathname: '/chatroom',
      params: {
        roomId: item.id,
        requestTitle: item.title,
        partnerNickname: isKorean ? item.requester.nickname : (item.helper?.nickname ?? ''),
        requestStatus: item.status,
        requesterId: item.requester.id,
        partnerUserId: String(partnerUserId),
        partnerPreferredLanguage,
      },
    });
  };

  const REPORT_REASONS = [
    t('community.reportSpam'),
    t('community.reportHate'),
    t('community.reportInappropriate'),
    t('community.reportFraud'),
    t('community.reportOther'),
  ];

  const handleReport = () => {
    if (!reportReason) {
      Alert.alert(t('community.selectReportReason'));
      return;
    }
    Alert.alert(t('community.reportDone'), t('community.reportDoneMsg'), [
      {
        text: t('common.confirm'),
        onPress: () => {
          setReportVisible(false);
          setReportReason('');
        },
      },
    ]);
  };

  const handleHelp = () => {
    Alert.alert(
      t('requestDetail.helpRequestTitle'),
      t('requestDetail.helpRequestMsg', { name: item.requester.nickname }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('home.acceptRequest'),
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
                    partnerUserId: String(item.requester.id),
                    partnerPreferredLanguage: item.requester.preferredLanguage ?? 'en',
                  },
                });
              } else {
                Alert.alert(t('common.error'), response.message);
              }
            } catch {
              Alert.alert(t('common.error'), t('errors.serverError'));
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
      {/* ── 항상 고정되는 상단 버튼 ── */}
      <TouchableOpacity style={styles.floatBack} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.floatMore} onPress={() => setReportVisible(true)}>
        <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
      </TouchableOpacity>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 상단 사진 (있을 때만) ── */}
        {meta['사진'] ? (
          <View style={styles.photoSection}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {meta['사진'].split(',').map((uri, idx) => (
                <TouchableOpacity key={idx} activeOpacity={0.95} onPress={() => setSelectedPhoto(uri.trim())}>
                  <Image source={{ uri: uri.trim() }} style={styles.heroBannerImg} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyBanner}>
            <Ionicons name={CATEGORY_ICON[item.category].name} size={s(48)} color="#AABBCC" />
          </View>
        )}

        {/* ── 작성자 정보 ── */}
        <View style={styles.authorRow}>
          <TouchableOpacity
            style={styles.authorAvatarWrap}
            activeOpacity={0.85}
            onPress={() => !isMyPost && item.requester.id && item.requester.nickname !== '(알 수 없음)' && router.push({ pathname: '/user-profile', params: { id: item.requester.id } })}
          >
            {showHeroImg ? (
              <Image source={{ uri: profileUri! }} style={styles.authorAvatar} onError={() => setImgError(true)} />
            ) : (
              <View style={styles.authorAvatarFallback}>
                <Text style={styles.authorAvatarEmoji}>{CategoryEmoji[item.category]}</Text>
              </View>
            )}
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#22c55e" />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{item.requester.nickname}</Text>
            <Text style={styles.authorSub}>{item.requester.major ?? item.requester.university ?? ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.ratingStars}>★ {item.requester.rating?.toFixed(1) ?? '0.0'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── 제목 + 본문 ── */}
        <View style={styles.bodySection}>
          <Text style={styles.titleText}>{item.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaTime}>{CategoryLabels[item.category].replace(/\S+\s/, '')}</Text>
            <Text style={styles.metaTime}>·</Text>
            <Text style={styles.metaTime}>{formatTime(item.createdAt, t)}</Text>
          </View>
          <Text style={styles.bodyText}>{body}</Text>
        </View>

        <View style={styles.divider} />

        {/* ── 매칭 방식 ── */}
        <View style={styles.bodySection}>
          <View style={styles.methodTitleRow}>
            <Text style={styles.sectionTitle}>{t('requestDetail.matchMethod')}</Text>
            <View style={styles.methodRow}>
              {(['ONLINE', 'OFFLINE'] as const).map((m) => {
                const isSelected = m === 'OFFLINE' ? item.helpMethod === 'OFFLINE' : item.helpMethod !== 'OFFLINE';
                const color = m === 'OFFLINE' ? ORANGE : BLUE;
                const label = m === 'OFFLINE' ? t('requestDetail.offline') : t('requestDetail.online');
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

        {/* ── 요청 정보 ── */}
        {(meta['희망일정'] || meta['소요시간'] || meta['장소'] || meta['언어']) && (
          <>
            <View style={styles.divider} />
            <View style={styles.bodySection}>
              <Text style={[styles.sectionTitle, { marginBottom: s(8) }]}>{t('requestDetail.requestInfo')}</Text>
              {(() => {
                const rows = [
                  meta['희망일정'] ? { label: t('write.schedule'), value: meta['희망일정'] } : null,
                  meta['소요시간'] ? { label: t('write.duration'), value: meta['소요시간'] } : null,
                  meta['장소']    ? { label: t('write.location'), value: meta['장소'] }    : null,
                  meta['언어']    ? { label: t('write.language'), value: meta['언어'] }    : null,
                ].filter(Boolean);
                return rows.map((row, i) => (
                  <View key={row!.label} style={[styles.infoRow, i === 0 && { borderTopWidth: 0 }]}>
                    <Text style={styles.infoLabel}>{row!.label}</Text>
                    <Text style={styles.infoValue}>{row!.value}</Text>
                  </View>
                ));
              })()}
            </View>
          </>
        )}

        {/* ── 추천 헬퍼 ── */}
        {isMyPost && item.status === 'WAITING' && (
          <>
            <View style={styles.divider} />
            <View style={styles.bodySection}>
              <Text style={[styles.sectionTitle, { marginBottom: s(12) }]}>추천 헬퍼</Text>
              {isLoadingRecommend ? (
                <ActivityIndicator size="small" color={BLUE} />
              ) : recommendedHelpers.length === 0 ? (
                <Text style={styles.helperDetail}>추천 가능한 헬퍼가 없습니다.</Text>
              ) : (
                recommendedHelpers.map((rec) => (
                  <View key={rec.helper.id} style={[styles.helperItem, { marginBottom: s(12) }]}>
                    {toAbsoluteUrl(rec.helper.profileImage) ? (
                      <Image source={{ uri: toAbsoluteUrl(rec.helper.profileImage)! }} style={styles.helperAvatar} />
                    ) : (
                      <View style={[styles.helperAvatar, styles.helperAvatarFallback]}>
                        <Text style={styles.helperAvatarText}>{getInitial(rec.helper.nickname)}</Text>
                      </View>
                    )}
                    <View style={styles.helperInfo}>
                      <Text style={styles.helperName}>{rec.helper.nickname}</Text>
                      <Text style={styles.helperDetail}>{rec.helper.university} · 도움 {rec.helper.helpCount}회</Text>
                      <Text style={styles.helperRating}>{'★★★★★'} <Text style={styles.helperRatingNum}>{rec.helper.rating.toFixed(1)}</Text></Text>
                      <Text style={[styles.helperDetail, { marginTop: s(2), color: BLUE }]}>{rec.matchReason}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* ── 매칭된 헬퍼 ── */}
        {item.helper && item.status !== 'COMPLETED' && item.status !== 'IN_PROGRESS' && (
          <>
            <View style={styles.divider} />
            <View style={styles.bodySection}>
              <Text style={[styles.sectionTitle, { marginBottom: s(12) }]}>{t('requestDetail.helperStudent')}</Text>
              <View style={styles.helperItem}>
                {toAbsoluteUrl(item.helper.profileImage) ? (
                  <Image source={{ uri: toAbsoluteUrl(item.helper.profileImage)! }} style={styles.helperAvatar} />
                ) : (
                  <View style={[styles.helperAvatar, styles.helperAvatarFallback]}>
                    <Text style={styles.helperAvatarText}>{getInitial(item.helper.nickname)}</Text>
                  </View>
                )}
                <View style={styles.helperInfo}>
                  <Text style={styles.helperName}>{item.helper.nickname}</Text>
                  <Text style={styles.helperDetail}>{item.helper.university} · {t('requestDetail.helpCountDetail', { count: item.helper.helpCount })}</Text>
                  <Text style={styles.helperRating}>{'★★★★★'} <Text style={styles.helperRatingNum}>{item.helper.rating.toFixed(1)}</Text></Text>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* ── 사진 확대 모달 ── */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <StatusBar hidden />
        <TouchableOpacity style={styles.photoModal} activeOpacity={1} onPress={() => setSelectedPhoto(null)}>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.photoFull}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity style={styles.photoCloseBtn} onPress={() => setSelectedPhoto(null)} activeOpacity={0.8}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── 하단 CTA ── */}
      <View style={styles.cta}>
{item.status === 'COMPLETED' ? (
          <View style={[styles.helpBtn, styles.helpBtnOutline]}>
            <Text style={styles.helpBtnOutlineText}>{t('requestDetail.helpCompleted')}</Text>
          </View>
        ) : (item.status === 'IN_PROGRESS' || item.status === 'MATCHED') && !isInChat ? (
          <View style={[styles.helpBtn, styles.helpBtnOutline]}>
            <Text style={styles.helpBtnOutlineText}>{t('requestDetail.helpInProgress')}</Text>
          </View>
        ) : isInChat ? (
          <TouchableOpacity style={styles.helpBtn} onPress={goToChatRoom}>
            <Ionicons name="chatbubble-outline" size={16} color={BLUE} />
            <Text style={styles.helpBtnText}>{t('requestDetail.goToChat')}</Text>
          </TouchableOpacity>
        ) : isMyPost && item.status === 'WAITING' ? (
          <View style={styles.myPostActions}>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
              <Text style={styles.editBtnText}>{t('common.edit')}</Text>
            </TouchableOpacity>
          </View>
        ) : isMyPost ? (
          <View style={styles.closedBtn}>
            <Text style={styles.closedBtnText}>{t('requestDetail.lockedAfterMatch')}</Text>
          </View>
        ) : item.status !== 'WAITING' ? (
          <View style={styles.closedBtn}>
            <Text style={styles.closedBtnText}>{t('requestDetail.alreadyMatched')}</Text>
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
                {user?.userType !== 'KOREAN' ? t('requestDetail.myRequest') : t('home.acceptRequest')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── 신고 모달 ── */}
      <Modal visible={reportVisible} transparent animationType="slide" onRequestClose={() => setReportVisible(false)}>
        <TouchableOpacity style={styles.reportOverlay} activeOpacity={1} onPress={() => setReportVisible(false)}>
          <TouchableOpacity style={styles.reportSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.reportHandleWrap} {...reportPanResponder.panHandlers}>
              <View style={styles.reportHandle} />
            </View>
            <Text style={styles.reportTitle}>{t('community.report')}</Text>
            <View style={styles.reportDivider} />
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.reportItem}
                activeOpacity={0.7}
                onPress={() => setReportReason(reason)}
              >
                <View style={[styles.reportRadio, reportReason === reason && styles.reportRadioOn]}>
                  {reportReason === reason && <View style={styles.reportRadioDot} />}
                </View>
                <Text style={[styles.reportItemText, reportReason === reason && styles.reportItemTextOn]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.reportDivider} />
            <View style={styles.reportBtnRow}>
              <TouchableOpacity style={styles.reportCancelBtn} onPress={() => { setReportVisible(false); setReportReason(''); }}>
                <Text style={styles.reportCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.reportSubmitBtn, !reportReason && styles.reportSubmitBtnOff]} onPress={handleReport}>
                <Text style={styles.reportSubmitText}>{t('community.report')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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

  // ── 상단 네비 (사진 없을 때) ──
  topNavNoBanner: {
    paddingTop: Platform.OS === 'ios' ? s(56) : s(36),
    paddingBottom: s(8),
    paddingHorizontal: s(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  navBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(10),
    backgroundColor: BLUE_L,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── 히어로 배너 사진 ──
  photoSection: {
    position: 'relative',
  },
  emptyBanner: {
    width: '100%',
    height: s(280),
    backgroundColor: '#E8ECF0',
    justifyContent: 'center',
    alignItems: 'center',
    gap: s(8),
  },
  emptyBannerIconWrap: {
    width: s(90),
    height: s(90),
    borderRadius: s(45),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: s(4),
  },
  emptyBannerLabel: {
    fontSize: s(15),
    fontWeight: '700',
    color: '#6B7280',
  },
  heroBannerImg: {
    width: Dimensions.get('window').width,
    height: s(280),
    backgroundColor: '#E0E0E0',
  },
  floatBack: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? s(56) : s(36),
    left: s(16),
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  floatMore: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? s(56) : s(36),
    right: s(16),
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fixedBack: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? s(56) : s(36),
    left: s(16),
    width: s(40),
    height: s(40),
    borderRadius: s(10),
    backgroundColor: BLUE_L,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fixedMore: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? s(56) : s(36),
    right: s(16),
    width: s(40),
    height: s(40),
    borderRadius: s(10),
    backgroundColor: BLUE_L,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  // ── 작성자 ──
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(16),
    paddingVertical: s(14),
    backgroundColor: '#fff',
    gap: s(10),
  },
  authorAvatarWrap: { position: 'relative' },
  authorAvatar: {
    width: s(56),
    height: s(56),
    borderRadius: s(28),
  },
  authorAvatarFallback: {
    width: s(56),
    height: s(56),
    borderRadius: s(28),
    backgroundColor: '#C7DCF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorAvatarInitial: {
    fontSize: s(22),
    fontWeight: '900',
    color: BLUE,
    opacity: 0.7,
  },
  authorAvatarEmoji: {
    fontSize: s(28),
  },
  authorInfo: { flex: 1 },
  ratingStars: { fontSize: s(15), fontWeight: '800', color: '#F59E0B' },
  authorName: { fontSize: s(17), fontWeight: '800', color: T1 },
  authorSub:  { fontSize: s(14), color: '#6B7280', marginTop: s(6), fontWeight: '700' },

  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: s(1) },
    shadowOpacity: 0.12,
    shadowRadius: s(3),
    elevation: 2,
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

  // ── 본문 영역 ──
  bodySection: {
    paddingHorizontal: s(16),
    paddingVertical: s(16),
    backgroundColor: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: s(14),
  },
  metaTime: { fontSize: s(14), color: '#6B7280', fontWeight: '700' },

  sectionTitle: {
    fontSize: s(17),
    fontWeight: '800',
    color: T1,
  },

  // 제목 + 본문
  titleText: {
    fontSize: s(22),
    fontWeight: '900',
    color: T1,
    letterSpacing: -0.4,
    lineHeight: s(30),
    marginBottom: s(8),
  },
  divider: {
    height: 1,
    backgroundColor: DIV,
  },
  bodyText: {
    fontSize: s(16),
    color: '#374151',
    lineHeight: s(28),
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
  infoLabel: { fontSize: s(15), color: T1, fontWeight: '600' },
  infoValue: { fontSize: s(15), fontWeight: '700', color: T1 },

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
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: s(8), marginHorizontal: s(16), marginTop: s(16),
    paddingVertical: s(14), borderRadius: s(14),
    backgroundColor: BLUE_L,
  },
  statusBannerText: { fontSize: s(15), fontWeight: '800' },

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
  photoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoFull: {
    width: '100%',
    height: '80%',
  },
  photoCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? s(56) : s(24),
    right: s(20),
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── 하단 CTA ──
  cta: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: s(40),
    paddingTop: s(4),
    paddingBottom: Platform.OS === 'ios' ? s(24) : s(12),
    minHeight: s(76),
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
    height: s(52),
    backgroundColor: '#fff',
    borderRadius: s(999),
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: s(6),
    borderWidth: s(1.5),
    borderColor: BLUE,
  },
  helpBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  helpBtnOutline: {
    backgroundColor: '#fff',
    borderWidth: s(1.5),
    borderColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  helpBtnOutlineText: {
    color: '#9CA3AF',
    fontSize: s(18),
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  helpBtnEmoji: { fontSize: s(16) },
  helpBtnText: {
    color: BLUE,
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
    borderRadius: s(25),
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
    borderRadius: s(25),
    borderWidth: s(1.5),
    borderColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: s(15),
    fontWeight: '800',
    color: '#F97316',
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
  completedBtn: {
    flex: 1,
    height: s(52),
    backgroundColor: '#D1D5DB',
    borderRadius: s(999),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: s(8),
  },
  completedBtnText: { fontSize: s(18), color: '#6B7280', fontWeight: '800', letterSpacing: -0.3 },

  // ── 신고 모달 ──
  reportOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  reportSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: s(32),
    borderTopRightRadius: s(32),
    paddingHorizontal: s(20),
    paddingBottom: Platform.OS === 'ios' ? s(40) : s(24),
    paddingTop: s(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  reportHandleWrap: {
    alignItems: 'center',
    paddingVertical: s(8),
    marginHorizontal: -s(20),
  },
  reportHandle: {
    width: s(40),
    height: s(4),
    borderRadius: s(2),
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: s(16),
  },
  reportTitle: {
    fontSize: s(18),
    fontWeight: '900',
    color: T1,
    marginBottom: s(4),
  },
  reportSub: {
    fontSize: s(13),
    color: T2,
    marginBottom: s(12),
  },
  reportDivider: {
    height: 1,
    backgroundColor: DIV,
    marginVertical: s(12),
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    paddingVertical: s(12),
  },
  reportRadio: {
    width: s(22),
    height: s(22),
    borderRadius: s(11),
    borderWidth: s(2),
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportRadioOn: {
    borderColor: BLUE,
  },
  reportRadioDot: {
    width: s(10),
    height: s(10),
    borderRadius: s(5),
    backgroundColor: BLUE,
  },
  reportItemText: {
    fontSize: s(15),
    color: T1,
    fontWeight: '500',
  },
  reportItemTextOn: {
    color: BLUE,
    fontWeight: '700',
  },
  reportBtnRow: {
    flexDirection: 'row',
    gap: s(10),
    marginTop: s(4),
  },
  reportCancelBtn: {
    flex: 1,
    height: s(50),
    borderRadius: s(14),
    borderWidth: s(1.5),
    borderColor: DIV,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportCancelText: {
    fontSize: s(15),
    fontWeight: '700',
    color: T2,
  },
  reportSubmitBtn: {
    flex: 1,
    height: s(50),
    borderRadius: s(14),
    backgroundColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportSubmitBtnOff: {
    backgroundColor: '#F3F4F6',
  },
  reportSubmitText: {
    fontSize: s(15),
    fontWeight: '800',
    color: '#fff',
  },
});
