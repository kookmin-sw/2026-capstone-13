// 마이페이지 화면
import { Ionicons } from '@expo/vector-icons';
import { s as sc } from '../../utils/scale';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { useAuthStore } from '../../stores/authStore';
import { useHelpHistoryStore } from '../../stores/helpHistoryStore';
import { useHelpRequestStore } from '../../stores/helpRequestStore';
import { getHelpedRequests } from '../../services/helpService';
import { useGoalStore } from '../../stores/goalStore';

const MAJORS = [
  '국어국문전공', '글로벌한국어전공', '영미어문전공', '글로벌커뮤니케이션영어전공',
  '중어중문학과', '한국역사학과',
  '행정학과', '정치외교학과', '사회학과', '미디어전공', '광고홍보학전공',
  '교육학과', '러시아·유라시아학과', '중국학전공', '일본학전공',
  '경제학과', '국제통상학과',
  '경영학전공', '재무금융전공', '경영정보전공', 'AI빅데이터융합경영학과',
  '회계세무학과', 'International Business',
  '신소재공학부', '기계공학부', '토목시스템공학부', '전자공학부',
  '산림환경시스템학과', '임산생명공학과', '나노전자물리학과', '응용화학부',
  '식품영양학과', '정보보안암호수학과', '바이오발효융합학과',
  '건축설계전공', '건축시스템전공',
  '공간디자인학과', '자동차·운송디자인학과', '시각디자인학과',
  '도자공예학과', '영상디자인학과', 'AI디자인학과',
  '스포츠교육전공', '스포츠산업레저전공', '스포츠건강재활전공',
  '성악전공', '피아노전공', '관현악전공', '작곡전공',
  '회화전공', '입체미술전공', '연극전공', '영화전공', '무용전공',
  '소프트웨어학부', '인공지능학부',
  '자동차공학과', '자동차IT융합학과', '미래모빌리티학과',
  '공법학전공', '사법학전공', '기업융합법학과',
  '기타',
];

// ── Design tokens (홈 화면과 동일) ──
const BLUE     = '#3B6FE8';
const BLUE_BG  = '#F5F8FF';
const BLUE_L   = '#EEF4FF';
const BLUE_MID = '#A8C8FA';
const BORDER   = '#D4E4FA';
const T1       = '#0E1E40';
const T3       = '#6B9DF0';


const COLOR_MALE   = '#0EA5E9';
const COLOR_FEMALE = '#DB2777';

const LANGUAGES = [
  { code: 'en',      label: '🇺🇸 English' },
  { code: 'ja',      label: '🇯🇵 日本語' },
  { code: 'zh-Hans', label: '🇨🇳 中文(简体)' },
  { code: 'ru',      label: '🇷🇺 Русский' },
  { code: 'mn',      label: '🇲🇳 Монгол' },
  { code: 'vi',      label: '🇻🇳 Tiếng Việt' },
];

interface ProfileDetail {
  bio: string;
  gender: string;
  age: string;
  major: string;
  mbti: string;
  hobbies: string[];
  preferredLanguage: string;
}

const EMPTY_DETAIL: ProfileDetail = { bio: '', gender: '', age: '', major: '', mbti: '', hobbies: [], preferredLanguage: 'en' };

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfileImage, updateProfileDetail, loadUser } = useAuthStore();
  const { helpHistory, fetchHelpHistory } = useHelpHistoryStore();
  const { fetchMyRequests, myRequests } = useHelpRequestStore();
  const [imageMenuVisible, setImageMenuVisible] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const { monthlyGoal, setMonthlyGoal } = useGoalStore();

  const isKorean = user?.userType === 'KOREAN';

  useEffect(() => {
    loadUser();
    if (isKorean) {
      fetchHelpHistory();
      getHelpedRequests().then(res => {
        if (res.success) {
          const now = new Date();
          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();
          const count = res.data.filter((r: any) => {
            const d = new Date(r.updatedAt ?? r.createdAt ?? '');
            return r.status === 'COMPLETED' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
          }).length;
          setCompletedCount(count);
        }
      }).catch(() => {});
    } else {
      fetchMyRequests();
    }
  }, []);

  const [imageLoadError, setImageLoadError] = useState(false);
  const [hasCustomPhoto, setHasCustomPhoto] = useState(false);

  useEffect(() => {
    const uri = user?.profileImage?.trim() ?? '';
    const isAbsolute =
      uri.startsWith('http://') ||
      uri.startsWith('https://') ||
      uri.startsWith('file://') ||
      uri.startsWith('content://') ||
      uri.startsWith('ph://');
    setHasCustomPhoto(isAbsolute);
    setImageLoadError(false);
  }, [user?.profileImage]);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileInput, setProfileInput] = useState<ProfileDetail>(EMPTY_DETAIL);
  const [hobbyInput, setHobbyInput] = useState('');
  const [showMajorList, setShowMajorList] = useState(false);
  const [birthModalVisible, setBirthModalVisible] = useState(false);
  const [birthYear, setBirthYear] = useState(2002);
  const [birthMonth, setBirthMonth] = useState(5);
  const [birthDay, setBirthDay] = useState(31);
  const [savedBirthYear, setSavedBirthYear] = useState(2002);
  const [savedBirthMonth, setSavedBirthMonth] = useState(5);
  const [savedBirthDay, setSavedBirthDay] = useState(31);

  const YEARS = Array.from({ length: 60 }, (_, i) => 2010 - i);
  const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
  const getDays = (y: number, m: number) => new Date(y, m, 0).getDate();

  const ITEM_HEIGHT = sc(44);
  const VISIBLE_ITEMS = 5;
  const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

  const yearRef = useRef<ScrollView>(null);
  const monthRef = useRef<ScrollView>(null);
  const dayRef = useRef<ScrollView>(null);

  const scrollToIndex = (ref: React.RefObject<ScrollView>, index: number, animated = true) => {
    ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated });
  };

  const handleOpenBirthPickerScroll = () => {
    const yIdx = YEARS.indexOf(savedBirthYear);
    const mIdx = savedBirthMonth - 1;
    const dIdx = savedBirthDay - 1;
    setTimeout(() => {
      scrollToIndex(yearRef, yIdx, false);
      scrollToIndex(monthRef, mIdx, false);
      scrollToIndex(dayRef, dIdx, false);
    }, 50);
  };

  const handleOpenBirthModal = () => {
    setBirthYear(savedBirthYear);
    setBirthMonth(savedBirthMonth);
    setBirthDay(savedBirthDay);
    setBirthModalVisible(true);
    handleOpenBirthPickerScroll();
  };

  const handleConfirmBirth = () => {
    const today = new Date();
    const birth = new Date(birthYear, birthMonth - 1, birthDay);
    let age = today.getFullYear() - birth.getFullYear();
    const notYetBirthday =
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
    if (notYetBirthday) age -= 1;
    setSavedBirthYear(birthYear);
    setSavedBirthMonth(birthMonth);
    setSavedBirthDay(birthDay);
    setProfileInput((prev) => ({ ...prev, age: String(age) }));
    setBirthModalVisible(false);
  };

  const userHobbies = user?.hobbies ? user.hobbies.split(',').filter(Boolean) : [];

  const filledCount = [user?.bio, user?.gender, user?.age, user?.major, user?.mbti]
    .filter((v) => v && v.trim() !== '').length + (userHobbies.length > 0 ? 1 : 0);

  const nicknameColor =
    user?.gender === '남자' ? COLOR_MALE :
    user?.gender === '여자' ? COLOR_FEMALE :
    T1;

  const handleOpenProfileModal = () => {
    setProfileInput({
      bio: user?.bio ?? '',
      gender: user?.gender ?? '',
      age: user?.age ?? '',
      major: user?.major ?? '',
      mbti: user?.mbti ?? '',
      hobbies: userHobbies,
      preferredLanguage: user?.preferredLanguage ?? 'en',
    });
    setHobbyInput('');
    setProfileModalVisible(true);
  };

  const handleAddHobby = () => {
    const tag = hobbyInput.trim();
    if (!tag || profileInput.hobbies.length >= 5) return;
    if (profileInput.hobbies.includes(tag)) return;
    setProfileInput((prev) => ({ ...prev, hobbies: [...prev.hobbies, tag] }));
    setHobbyInput('');
  };

  const handleRemoveHobby = (index: number) => {
    setProfileInput((prev) => ({
      ...prev,
      hobbies: prev.hobbies.filter((_, i) => i !== index),
    }));
  };

  const handleSaveProfile = async () => {
    await updateProfileDetail({
      bio: profileInput.bio,
      gender: profileInput.gender,
      age: profileInput.age,
      major: profileInput.major,
      mbti: profileInput.mbti,
      hobbies: profileInput.hobbies.join(','),
      preferredLanguage: profileInput.preferredLanguage,
    });
    setProfileModalVisible(false);
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃', style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleDeleteImage = () => {
    setImageMenuVisible(false);
    Alert.alert('프로필 사진 삭제', '프로필 사진을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          setHasCustomPhoto(false);
          setImageLoadError(false);
          await updateProfileImage('');
        },
      },
    ]);
  };

  const handlePickImage = async (source: 'camera' | 'gallery') => {
    setImageMenuVisible(false);

    let permissionResult;
    if (source === 'camera') {
      permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    } else {
      permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    if (!permissionResult.granted) {
      Alert.alert('권한 필요', source === 'camera' ? '카메라 접근 권한이 필요합니다.' : '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });

    if (!result.canceled && result.assets[0]) {
      setImageLoadError(false);
      setHasCustomPhoto(true);
      await updateProfileImage(result.assets[0].uri);
    }
  };


  const MENU_ITEMS = [
    isKorean
      ? { icon: 'heart-outline' as const, label: '내 도움 내역', route: '/my-help-history' }
      : { icon: 'document-text-outline' as const, label: '내 도움 내역', route: '/my-requests' },
    { icon: 'star-outline' as const, label: '후기 관리', route: '/my-reviews' },
    { icon: 'settings-outline' as const, label: '계정 설정', route: '/account-settings' },
    { icon: 'notifications-outline' as const, label: '알림 설정', route: '/notifications' as const },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

      {/* ── 프로필 영역 ── */}
      <View style={styles.profileSection}>
        {/* 아바타 + 정보 */}
        <View style={styles.profileRow}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={() => setImageMenuVisible(true)} activeOpacity={0.8}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.nickname?.charAt(0) ?? '?'}</Text>
              </View>
              {user?.profileImage?.trim() && !imageLoadError && (
                <Image
                  source={{ uri: user.profileImage }}
                  style={styles.avatarImageOverlay}
                  onError={() => setImageLoadError(true)}
                />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <View style={styles.nicknameRow}>
              <Text style={[styles.nickname, { color: '#111111' }]}>
                {user?.nickname ?? '사용자'}
              </Text>
              {(user?.studentIdVerified || user?.studentIdStatus === 'APPROVED') && (
                <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
              )}
            </View>
            <View style={styles.handleRow}>
              {user?.major ? (
                <Text style={styles.handleText} numberOfLines={1}>
                  {user.major}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={handleOpenProfileModal} activeOpacity={0.8}>
              <Ionicons name="pencil" size={13} color="#fff" />
              <Text style={styles.editBtnText}> 프로필 수정</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── 활동 카드 (외국인: 받은 도움 횟수) ── */}
      {!isKorean && (() => {
        const now = new Date();
        const receivedCount = myRequests.filter(r => {
          if (r.status !== 'COMPLETED') return false;
          const d = new Date(r.updatedAt ?? r.createdAt ?? '');
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        return (
          <View style={styles.activityCard}>
            <View style={styles.activityTopRow}>
              <View style={styles.activityStreakWrap}>
                <Text style={styles.activityStreak}>이번달 받은 도움</Text>
              </View>
              <View style={[styles.activityGoalStepper, { gap: sc(4) }]}>
                <Text style={[styles.activityGoalValue, { fontSize: sc(26), color: BLUE }]}>{receivedCount}</Text>
                <Text style={{ fontSize: sc(14), color: BLUE, fontWeight: '800' }}>건</Text>
              </View>
            </View>
          </View>
        );
      })()}

      {/* ── 활동 카드 (한국인만 표시) ── */}
      {isKorean ? (() => {
        const progress = Math.min(completedCount / monthlyGoal, 1);
        return (
          <View style={styles.activityCard}>
            <View style={styles.activityTopRow}>
              <View style={styles.activityStreakWrap}>
                <Text style={styles.activityStreak}>이번달 도움 목표를 설정해보세요</Text>
              </View>
              <View style={styles.activityGoalStepper}>
                <TouchableOpacity
                  style={styles.activityStepBtn}
                  activeOpacity={0.7}
                  onPress={() => setMonthlyGoal(Math.max(0, monthlyGoal - 5))}
                >
                  <Text style={styles.activityStepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.activityGoalValue}>{monthlyGoal}</Text>
                <TouchableOpacity
                  style={styles.activityStepBtn}
                  activeOpacity={0.7}
                  onPress={() => setMonthlyGoal(monthlyGoal + 5)}
                >
                  <Text style={styles.activityStepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.activityProgressWrap}>
              <View style={styles.activityProgressLabelRow}>
                <Text style={styles.activityProgressLabel}>이번달 도움 횟수</Text>
                <Text style={styles.activityProgressCount}>{completedCount} / {monthlyGoal}</Text>
              </View>
              <View style={styles.activityProgressTrack}>
                <View
                  style={[
                    styles.activityProgressFill,
                    {
                      width: `${progress * 100}%` as `${number}%`,
                      backgroundColor: monthlyGoal === 0 ? '#D1D5DB' : progress >= 1 ? '#22C55E' : BLUE,
                    },
                  ]}
                />
              </View>
              <View style={styles.activityProgressLabels}>
                <Text style={styles.activityProgressStart}>0</Text>
                <Text style={styles.activityProgressEnd}>{monthlyGoal}회 달성</Text>
              </View>
            </View>
          </View>
        );
      })() : null}

      {/* ── 인증 + 평점 미니 카드 ── */}
      <View style={styles.miniCardRow}>
        {/* 학생 인증 */}
        <View style={styles.miniCard}>
          {user?.studentIdStatus === 'APPROVED' ? (
            <>
              <Ionicons name="shield-checkmark" size={28} color="#22C55E" />
              <Text style={styles.miniCardTitle}>인증 완료</Text>
              <Text style={styles.miniCardSub}>학생 인증됨</Text>
            </>
          ) : (
            <>
              <Ionicons name="shield-outline" size={28} color={BLUE_MID} />
              <Text style={[styles.miniCardTitle, { color: BLUE_MID }]}>미인증</Text>
              <Text style={styles.miniCardSub}>학생증 인증 필요</Text>
            </>
          )}
        </View>

        {/* 평점 */}
        <View style={styles.miniCard}>
          <Text style={styles.miniCardRating}>{user?.rating?.toFixed(1) ?? '0.0'}</Text>
          <View style={styles.miniCardStars}>
            {[1, 2, 3, 4, 5].map(i => (
              <Ionicons key={i} name="star" size={12} color={i <= Math.round(user?.rating ?? 0) ? '#FBBF24' : '#E5E7EB'} />
            ))}
          </View>
          <Text style={styles.miniCardSub}>내 평점</Text>
        </View>
      </View>

      {/* ── 메뉴 ── */}
      <View style={styles.menuCard}>
        {MENU_ITEMS.map((item, idx) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, idx < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
            onPress={() => item.route && router.push(item.route as never)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconWrap}>
              <Ionicons name={item.icon} size={18} color={BLUE} />
            </View>
            <Text style={styles.menuText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={BORDER} />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 로그아웃 ── */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      {/* 프로필 사진 변경 모달 */}
      <Modal transparent animationType="fade" visible={imageMenuVisible} onRequestClose={() => setImageMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setImageMenuVisible(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => handlePickImage('camera')} activeOpacity={0.7}>
              <View style={styles.bottomSheetIconWrap}>
                <Ionicons name="camera-outline" size={20} color={BLUE} />
              </View>
              <Text style={styles.bottomSheetItemText}>카메라로 촬영</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => handlePickImage('gallery')} activeOpacity={0.7}>
              <View style={styles.bottomSheetIconWrap}>
                <Ionicons name="image-outline" size={20} color={BLUE} />
              </View>
              <Text style={styles.bottomSheetItemText}>갤러리에서 선택</Text>
            </TouchableOpacity>

            {hasCustomPhoto && (
              <TouchableOpacity style={styles.bottomSheetItem} onPress={handleDeleteImage} activeOpacity={0.7}>
                <View style={[styles.bottomSheetIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.bottomSheetItemText, { color: '#EF4444' }]}>삭제하기</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.bottomSheetCancel} onPress={() => setImageMenuVisible(false)} activeOpacity={0.7}>
              <Text style={styles.bottomSheetCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>


      {/* 프로필 상세 편집 모달 */}
      <Modal transparent={false} animationType="slide" visible={profileModalVisible} onRequestClose={() => setProfileModalVisible(false)}>
        <KeyboardAvoidingView style={styles.profileModalFull} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          {/* 헤더 - 절대 위치 버튼들 */}
          <TouchableOpacity style={styles.profileCloseBtn} onPress={() => setProfileModalVisible(false)} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={T1} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileSaveFloatBtn} onPress={handleSaveProfile} activeOpacity={0.7}>
            <Text style={styles.profileModalSaveBtn}>저장</Text>
          </TouchableOpacity>

          <ScrollView style={styles.profileScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.profileScrollContent} keyboardShouldPersistTaps="handled">

              {/* 1. 프로필 사진 */}
              <View style={styles.photoMainWrap}>
                <View style={styles.photoMainBox}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setImageMenuVisible(true)} activeOpacity={0.8}>
                    {user?.profileImage?.trim() && !imageLoadError ? (
                      <Image
                        source={{ uri: user.profileImage }}
                        style={styles.photoMainImage}
                        onError={() => setImageLoadError(true)}
                      />
                    ) : (
                      <View style={styles.photoMainPlaceholder}>
                        <Ionicons name="person" size={sc(40)} color="#CCCCCC" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.photoCameraBtn} onPress={() => setImageMenuVisible(true)} activeOpacity={0.8}>
                  <Ionicons name="camera" size={sc(16)} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.editSectionDivider} />

              {/* 2. 내 소개 */}
              <Text style={styles.editSectionTitle}>한줄 소개</Text>
              <TextInput
                style={styles.editTextarea}
                value={profileInput.bio}
                onChangeText={(text) => setProfileInput((prev) => ({ ...prev, bio: text }))}
                placeholder={'간단히 나를 소개해보세요.\n소개말이 있으면 호감도가 올라가요.'}
                placeholderTextColor={BLUE_MID}
                multiline
                maxLength={100}
                textAlignVertical="top"
              />

              <View style={styles.editSectionDivider} />

              {/* 3. 기본 정보 */}
              <Text style={styles.editSectionTitle}>기본 정보</Text>

              {/* 성별 */}

              <View style={[styles.editFieldWrap, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: sc(12) }]}>
                <Text style={[styles.editFieldLabel, { marginBottom: 0, marginTop: sc(6), fontSize: sc(16) }]}>성별</Text>
                <View style={styles.chipRow}>
                  {[{ label: '남성', value: '남자' }, { label: '여성', value: '여자' }].map(({ label, value }) => {
                    const isSelected = profileInput.gender === value;
                    const isLocked = !!user?.gender;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[styles.optionChip, isSelected && styles.optionChipActive]}
                        onPress={() => {
                          if (isLocked) return;
                          setProfileInput((prev) => ({ ...prev, gender: value }));
                        }}
                        activeOpacity={isLocked ? 1 : 0.8}
                      >
                        <Text style={[styles.optionChipText, isSelected && styles.optionChipTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.editSectionDivider} />

              {/* 나이 */}
              <View style={[styles.editFieldWrap, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <Text style={[styles.editFieldLabel, { marginBottom: 0, fontSize: sc(16) }]}>나이</Text>
                <TouchableOpacity
                  style={[styles.editInput, { marginLeft: sc(12), paddingHorizontal: sc(10) }]}
                  onPress={handleOpenBirthModal}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: profileInput.age ? T1 : BLUE_MID, fontSize: sc(15) }}>
                    {profileInput.age ? `${birthYear}년 ${birthMonth}월 ${birthDay}일 (만 ${profileInput.age}세)` : '생년월일을 선택하세요'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.editSectionDivider} />

              {/* 학과 */}
              <View style={styles.editFieldWrap}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.editFieldLabel, { marginBottom: 0, fontSize: sc(16) }]}>학과</Text>
                  <TouchableOpacity
                    style={[styles.editInput, { marginLeft: sc(12), alignSelf: 'flex-end', minWidth: sc(160), maxWidth: sc(200), paddingHorizontal: sc(10) }, isKorean && { backgroundColor: BORDER, opacity: 0.7 }]}
                    onPress={() => {
                      if (isKorean) {
                        Alert.alert('학생증 인증 필요', '한국인 학생은 학생증 인증 후 전공을 변경할 수 있습니다.');
                        return;
                      }
                      setShowMajorList((v) => !v);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: profileInput.major ? T1 : BLUE_MID, fontSize: sc(15) }}>
                        {profileInput.major || '학과를 선택하세요'}
                      </Text>
                      {isKorean
                        ? <Ionicons name="lock-closed-outline" size={16} color={BLUE_MID} />
                        : <Ionicons name={showMajorList ? 'chevron-up' : 'chevron-down'} size={16} color={BLUE_MID} />
                      }
                    </View>
                  </TouchableOpacity>
                </View>
                {isKorean && (
                  <Text style={{ fontSize: sc(11), color: BLUE_MID, marginTop: sc(4), textAlign: 'right' }}>학생증 인증 후 변경 가능합니다.</Text>
                )}
                {showMajorList && !isKorean && (
                  <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: sc(12), marginTop: sc(4), overflow: 'hidden' }}>
                    {MAJORS.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={{ paddingHorizontal: sc(14), paddingVertical: sc(11), backgroundColor: profileInput.major === item ? BLUE_L : '#fff', borderBottomWidth: 1, borderBottomColor: BORDER }}
                        onPress={() => { setProfileInput((prev) => ({ ...prev, major: item })); setShowMajorList(false); }}
                      >
                        <Text style={{ fontSize: sc(14), color: profileInput.major === item ? BLUE : T1, fontWeight: profileInput.major === item ? '700' : '400' }}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.editSectionDivider} />

              {/* 번역 언어 */}
              <Text style={styles.editSectionTitle}>번역 언어</Text>
              <View style={[styles.chipRow, { marginTop: sc(12) }]}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.optionChip, profileInput.preferredLanguage === lang.code && styles.optionChipActive]}
                    onPress={() => setProfileInput((prev) => ({ ...prev, preferredLanguage: lang.code }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionChipText, profileInput.preferredLanguage === lang.code && styles.optionChipTextActive]}>
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.editSectionDivider} />

              {/* 취미 */}
              <View style={[styles.editRowBetween, { marginBottom: sc(12) }]}>
                <Text style={styles.editSectionTitle}>취미</Text>
                <Text style={styles.editOptional}>({profileInput.hobbies.length}/5)</Text>
              </View>
              {profileInput.hobbies.length > 0 && (
                <View style={styles.hobbyTagList}>
                  {profileInput.hobbies.map((h, i) => (
                    <View key={h} style={styles.hobbyTagEdit}>
                      <Text style={styles.hobbyTagEditText}>#{h}</Text>
                      <TouchableOpacity onPress={() => handleRemoveHobby(i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Ionicons name="close" size={13} color={BLUE} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              {profileInput.hobbies.length < 5 && (
                <View style={styles.hobbyInputRow}>
                  <TextInput
                    style={styles.hobbyInputField}
                    value={hobbyInput}
                    onChangeText={setHobbyInput}
                    onSubmitEditing={handleAddHobby}
                    placeholder="취미를 입력하세요"
                    returnKeyType="done"
                    placeholderTextColor={BLUE_MID}
                  />
                  <TouchableOpacity style={styles.hobbyAddButton} onPress={handleAddHobby} activeOpacity={0.8}>
                    <Text style={styles.hobbyAddButtonText}>추가</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ height: sc(32) }} />

          </ScrollView>

          {/* 사진 선택 인라인 오버레이 */}
          {imageMenuVisible && (
            <TouchableOpacity style={styles.inlineOverlay} activeOpacity={1} onPress={() => setImageMenuVisible(false)}>
              <TouchableOpacity style={styles.inlineSheet} activeOpacity={1} onPress={() => {}}>
                <View style={styles.bottomSheetHandle} />
                <TouchableOpacity style={styles.bottomSheetItem} onPress={() => handlePickImage('camera')} activeOpacity={0.7}>
                  <View style={styles.bottomSheetIconWrap}>
                    <Ionicons name="camera-outline" size={20} color={BLUE} />
                  </View>
                  <Text style={styles.bottomSheetItemText}>카메라로 촬영</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomSheetItem} onPress={() => handlePickImage('gallery')} activeOpacity={0.7}>
                  <View style={styles.bottomSheetIconWrap}>
                    <Ionicons name="image-outline" size={20} color={BLUE} />
                  </View>
                  <Text style={styles.bottomSheetItemText}>갤러리에서 선택</Text>
                </TouchableOpacity>
                {hasCustomPhoto && (
                  <TouchableOpacity style={styles.bottomSheetItem} onPress={handleDeleteImage} activeOpacity={0.7}>
                    <View style={[styles.bottomSheetIconWrap, { backgroundColor: '#FEF2F2' }]}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </View>
                    <Text style={[styles.bottomSheetItemText, { color: '#EF4444' }]}>삭제하기</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.bottomSheetCancel} onPress={() => setImageMenuVisible(false)} activeOpacity={0.7}>
                  <Text style={styles.bottomSheetCancelText}>취소</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* 생년월일 피커 오버레이 */}
          {birthModalVisible && (
            <View style={styles.inlineOverlay}>
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setBirthModalVisible(false)} />
              <View style={styles.inlineSheet}>
                <View style={styles.bottomSheetHandle} />
                <Text style={styles.bottomSheetTitle}>생년월일 선택</Text>
                <View style={{ height: 1, backgroundColor: BORDER, marginBottom: sc(12) }} />

                {/* 슬롯 피커 */}
                <View style={{ height: PICKER_HEIGHT, flexDirection: 'row', gap: sc(8), paddingHorizontal: sc(8) }}>

                  {/* 년 */}
                  <View style={{ flex: 1, position: 'relative' }}>
                    <View pointerEvents="none" style={{
                      position: 'absolute', left: 0, right: 0,
                      top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT,
                      borderRadius: sc(10), borderWidth: 1.5, borderColor: BLUE,
                      zIndex: 1,
                    }} />
                    <ScrollView
                      ref={yearRef}
                      style={{ flex: 1 }}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={ITEM_HEIGHT}
                      decelerationRate="fast"
                      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                      onMomentumScrollEnd={(e) => {
                        const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                        setBirthYear(YEARS[Math.max(0, Math.min(idx, YEARS.length - 1))]);
                      }}
                    >
                      {YEARS.map((y) => (
                        <View key={y} style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: sc(15), color: birthYear === y ? BLUE : '#999', fontWeight: birthYear === y ? '700' : '400' }}>{y}년</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                  {/* 월 */}
                  <View style={{ flex: 1, position: 'relative' }}>
                    <View pointerEvents="none" style={{
                      position: 'absolute', left: 0, right: 0,
                      top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT,
                      borderRadius: sc(10), borderWidth: 1.5, borderColor: BLUE,
                      zIndex: 1,
                    }} />
                    <ScrollView
                      ref={monthRef}
                      style={{ flex: 1 }}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={ITEM_HEIGHT}
                      decelerationRate="fast"
                      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                      onMomentumScrollEnd={(e) => {
                        const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                        setBirthMonth(idx + 1);
                      }}
                    >
                      {MONTHS.map((m) => (
                        <View key={m} style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: sc(15), color: birthMonth === m ? BLUE : '#999', fontWeight: birthMonth === m ? '700' : '400' }}>{m}월</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                  {/* 일 */}
                  <View style={{ flex: 1, position: 'relative' }}>
                    <View pointerEvents="none" style={{
                      position: 'absolute', left: 0, right: 0,
                      top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT,
                      borderRadius: sc(10), borderWidth: 1.5, borderColor: BLUE,
                      zIndex: 1,
                    }} />
                    <ScrollView
                      ref={dayRef}
                      style={{ flex: 1 }}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={ITEM_HEIGHT}
                      decelerationRate="fast"
                      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                      onMomentumScrollEnd={(e) => {
                        const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                        const days = getDays(birthYear, birthMonth);
                        setBirthDay(Math.max(1, Math.min(idx + 1, days)));
                      }}
                    >
                      {Array.from({ length: getDays(birthYear, birthMonth) }, (_, i) => i + 1).map((d) => (
                        <View key={d} style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: sc(15), color: birthDay === d ? BLUE : '#999', fontWeight: birthDay === d ? '700' : '400' }}>{d}일</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                </View>

                <TouchableOpacity style={[styles.birthConfirmBtn, { borderRadius: sc(30), marginHorizontal: sc(24), marginBottom: sc(16), marginTop: sc(16) }]} onPress={handleConfirmBirth} activeOpacity={0.8}>
                  <Text style={styles.birthConfirmText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  scrollContent: { paddingTop: Platform.OS === 'ios' ? sc(75) : sc(48), paddingBottom: sc(40) },

  // ── 상단 바 ──
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: sc(16), paddingVertical: sc(10), backgroundColor: '#F0F4FA',
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: sc(8) },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: sc(4) },
  topBarIcon: { padding: sc(6) },
  pointBadge: {
    width: sc(32), height: sc(32), borderRadius: sc(16),
    backgroundColor: '#F0A040',
    justifyContent: 'center', alignItems: 'center',
  },
  pointBadgeLabel: { fontSize: sc(11), fontWeight: '900', color: '#fff' },
  pointValue: { fontSize: sc(16), fontWeight: '700', color: T1 },

  // ── 프로필 섹션 ──
  profileSection: {
    backgroundColor: '#F0F4FA',
    marginBottom: sc(4),
    paddingHorizontal: sc(20), paddingTop: sc(20), paddingBottom: sc(8),
    position: 'relative',
  },
  profileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: sc(10), marginBottom: sc(14) },
  avatarWrapper: { alignItems: 'center' },
  avatarRing: {
    width: sc(88), height: sc(88), borderRadius: sc(44),
    borderWidth: sc(2), borderColor: '#D0D0D0',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: sc(84), height: sc(84), borderRadius: sc(42),
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImageOverlay: {
    width: sc(84), height: sc(84), borderRadius: sc(42),
    position: 'absolute', top: 0, left: 0,
  },
  avatarText: { fontSize: sc(26), fontWeight: '800', color: '#FFFFFF' },
  avatarProgressLabel: { marginTop: sc(4) },
  flagBadge: {
    position: 'absolute', bottom: -2, left: 0,
    width: sc(23), height: sc(23), borderRadius: sc(11.5),
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#D0D0D0',
    overflow: 'hidden',
  },
  flagText: { fontSize: sc(16), textAlign: 'center', includeFontPadding: false, lineHeight: sc(16), marginLeft: 1 },
  avatarProgressText: { fontSize: sc(12), fontWeight: '700', color: BLUE_MID },

  profileInfo: { flex: 1, gap: 0, marginTop: sc(10) },
  nicknameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: sc(6) },
  nickname: { fontSize: sc(20), fontWeight: '900', color: T1, letterSpacing: -0.5 },
  levelBadge: {
    borderRadius: sc(20), paddingHorizontal: sc(8), paddingVertical: sc(2),
    alignSelf: 'flex-start',
    borderWidth: 1.5,
  },
  levelBadgeText: { fontSize: sc(11), fontWeight: '900' },

  handleRow: { flexDirection: 'row', alignItems: 'center', gap: sc(6), marginTop: sc(4) },
  handleText: { fontSize: sc(16), color: '#999999', fontWeight: '700' },

  followRow: { flexDirection: 'row', alignItems: 'center', marginTop: sc(2) },
  followCount: { fontSize: sc(14), fontWeight: '700', color: T1 },
  followLabel: { fontSize: sc(13), color: BLUE_MID },

  editBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BLUE, borderRadius: sc(6),
    paddingHorizontal: sc(8), paddingVertical: sc(4),
    alignSelf: 'flex-start', marginTop: sc(8),
  },
  editBtnText: { fontSize: sc(15), fontWeight: '700', color: '#fff' },

  modalAvatarWrap: { alignItems: 'center', paddingVertical: sc(16) },
  modalAvatarRing: {
    width: sc(88), height: sc(88), borderRadius: sc(44),
    borderWidth: sc(2), borderColor: '#D0D0D0',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  modalAvatar: {
    width: sc(84), height: sc(84), borderRadius: sc(42),
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
  },
  modalAvatarText: { fontSize: sc(26), fontWeight: '800', color: '#FFFFFF' },
  modalAvatarOverlay: {
    width: sc(84), height: sc(84), borderRadius: sc(42),
    position: 'absolute', top: 0, left: 0,
  },
  modalAvatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: sc(26), height: sc(26), borderRadius: sc(13),
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: sc(2), borderColor: '#fff',
  },

  photoSectionWrap: { paddingHorizontal: sc(20), paddingVertical: sc(20) },
  photoSectionTitle: { fontSize: sc(18), fontWeight: '800', color: T1, marginBottom: sc(4) },
  photoSectionSub: { fontSize: sc(13), color: '#999999', marginBottom: sc(16) },
  photoMainWrap: { position: 'relative', alignSelf: 'center' },
  photoMainBox: {
    width: sc(120), height: sc(120),
    borderRadius: sc(60), overflow: 'hidden',
    backgroundColor: '#F2F2F2',
  },
  photoRemoveBtn: {
    position: 'absolute', top: sc(8), right: sc(8),
    width: sc(24), height: sc(24), borderRadius: sc(12),
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  photoCameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: sc(32), height: sc(32), borderRadius: sc(16),
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: sc(4), elevation: 4,
  },
  photoMainImage: { width: '100%', height: '100%' },
  photoMainPlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  photoMainBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: sc(6), paddingHorizontal: sc(8), paddingVertical: sc(3),
  },
  photoMainBadgeText: { fontSize: sc(12), fontWeight: '700', color: '#fff' },
  photoSectionDivider: { height: sc(8), backgroundColor: '#F2F2F2' },

  inlineOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  inlineSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: sc(24), borderTopRightRadius: sc(24),
    paddingHorizontal: sc(16), paddingBottom: sc(40), paddingTop: sc(12),
  },

  birthPickerRow: { flexDirection: 'row', height: sc(200), marginTop: sc(8), marginBottom: sc(16) },
  birthPickerCol: { flex: 1 },
  birthPickerItem: {
    paddingVertical: sc(10), alignItems: 'center',
    borderRadius: sc(8), marginVertical: sc(2),
  },
  birthPickerItemActive: { backgroundColor: BLUE_L },
  birthPickerText: { fontSize: sc(15), color: '#999' },
  birthPickerTextActive: { fontSize: sc(15), color: BLUE, fontWeight: '700' },
  birthConfirmBtn: {
    backgroundColor: BLUE, borderRadius: sc(12),
    paddingVertical: sc(14), alignItems: 'center',
  },
  birthConfirmText: { fontSize: sc(16), fontWeight: '700', color: '#fff' },

  detailBio: { fontSize: sc(13), color: T1, lineHeight: sc(18), marginBottom: sc(10) },

  infoTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: sc(6), marginBottom: sc(6) },
  typeBadge: {
    backgroundColor: BLUE_L, paddingHorizontal: sc(10), paddingVertical: sc(4),
    borderRadius: sc(20), borderWidth: 1, borderColor: BORDER,
  },
  typeBadgeText: { fontSize: sc(12), color: BLUE, fontWeight: '600' },
  university: { fontSize: sc(13), color: BLUE_MID, fontWeight: '500' },

  // ── 스트릭 + 방문자 ──
  activityCard: {
    marginHorizontal: sc(16), marginBottom: sc(8),
    backgroundColor: '#fff', borderRadius: sc(20),
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(4) },
    shadowOpacity: 0.12, shadowRadius: sc(12), elevation: 6,
  },
  activityHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: sc(14), paddingBottom: sc(10),
  },
  activityTitle: { fontSize: sc(15), fontWeight: '800', color: T1 },
  activityLevelBadge: {
    borderRadius: sc(10), borderWidth: 1.5, width: sc(58), height: sc(32),
    alignItems: 'center', justifyContent: 'center',
  },
  activityLevelText: { fontSize: sc(13), fontWeight: '800' },
  activityRatingRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: sc(14),
    paddingHorizontal: sc(14), marginBottom: sc(10),
  },
  activityRatingNum: { fontSize: sc(44), fontWeight: '900', color: T1, letterSpacing: -2, lineHeight: sc(44) },
  activityStarsRow: { flexDirection: 'row', gap: sc(3), marginBottom: sc(5) },
  activityShortcuts: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: BORDER,
    paddingTop: sc(10), paddingBottom: sc(12), paddingHorizontal: sc(10),
  },
  activityShortcut: { flex: 1, alignItems: 'center', gap: sc(6) },
  activityShortcutLabel: { fontSize: sc(11), fontWeight: '600', color: '#333' },
  activityDivider: { width: 1, backgroundColor: BORDER, alignSelf: 'stretch', marginTop: -16, marginBottom: -18 },

  activityStreak: { fontSize: sc(17), fontWeight: '900', color: T1, marginBottom: sc(4) },
  activitySub: { fontSize: sc(12), color: BLUE_MID },
  activityProgressWrap: { paddingHorizontal: sc(14), paddingBottom: sc(16) },
  activityProgressTrack: {
    height: sc(8), borderRadius: sc(8), backgroundColor: '#F0F2F6', overflow: 'hidden', marginBottom: sc(6),
  },
  activityProgressFill: { height: '100%', borderRadius: sc(8) },
  activityProgressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  activityProgressStart: { fontSize: sc(11), color: BLUE_MID },
  activityProgressEnd: { fontSize: sc(11), color: BLUE_MID },

  // ── 목표 스테퍼 ──
  activityGoalStepper: {
    flexDirection: 'row', alignItems: 'center', gap: sc(8),
  },
  activityStepBtn: {
    width: sc(28), height: sc(28), borderRadius: sc(8),
    backgroundColor: BLUE_L, alignItems: 'center', justifyContent: 'center',
  },
  activityStepBtnText: { fontSize: sc(18), fontWeight: '800', color: BLUE, lineHeight: sc(22) },
  activityGoalValue: { fontSize: sc(16), fontWeight: '800', color: T1, minWidth: sc(28), textAlign: 'center' },

  // ── 목표 수정 모달 ──
  goalEditSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: sc(20), borderTopRightRadius: sc(20),
    padding: sc(24), paddingBottom: sc(40), alignItems: 'center',
  },
  goalEditTitle: { fontSize: sc(17), fontWeight: '800', color: T1, marginBottom: sc(6) },
  goalEditSub: { fontSize: sc(13), color: BLUE_MID, marginBottom: sc(20), textAlign: 'center' },
  goalEditInput: {
    width: '100%', borderWidth: 1.5, borderColor: BORDER, borderRadius: sc(12),
    fontSize: sc(28), fontWeight: '800', color: T1, textAlign: 'center',
    paddingVertical: sc(12), marginBottom: sc(20),
  },
  goalEditBtn: {
    width: '100%', backgroundColor: BLUE, borderRadius: sc(12),
    paddingVertical: sc(14), alignItems: 'center',
  },
  goalEditBtnText: { fontSize: sc(15), fontWeight: '800', color: '#fff' },

  activityTopRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: sc(16), paddingBottom: sc(12), gap: sc(12),
  },
  activityFireWrap: {
    width: sc(44), height: sc(44), borderRadius: sc(14),
    backgroundColor: '#FFF3E8',
    justifyContent: 'center', alignItems: 'center',
  },
  activityFireIcon: { fontSize: sc(24) },
  activityStreakWrap: { flex: 1 },
  activityDots: { flexDirection: 'row', gap: sc(5) },
  activityDot: {
    width: sc(8), height: sc(8), borderRadius: sc(4),
    backgroundColor: '#E8EDF5',
  },
  activityDotOn: { backgroundColor: BLUE },
  activityProgressLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sc(8),
  },
  activityProgressLabel: { fontSize: sc(12), color: BLUE_MID, fontWeight: '600' },
  activityProgressCount: { fontSize: sc(12), color: BLUE_MID, fontWeight: '700' },

  // ── 모멘츠 ──
  momentsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: sc(16), marginBottom: sc(10),
    borderRadius: sc(16), paddingHorizontal: sc(18), paddingVertical: sc(14),
    borderWidth: 1, borderColor: BORDER,
  },
  momentsLeft: { flexDirection: 'row', alignItems: 'center', gap: sc(10) },
  momentsIcon: { fontSize: sc(20) },
  momentsLabel: { fontSize: sc(15), fontWeight: '600', color: T1 },

  miniCardRow: {
    flexDirection: 'row', gap: sc(10),
    marginHorizontal: sc(16), marginBottom: sc(10),
  },
  miniCard: {
    flex: 1, backgroundColor: '#FFFFFF',
    borderRadius: sc(16), padding: sc(16),
    alignItems: 'center', gap: sc(6),
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(2) },
    shadowOpacity: 0.08, shadowRadius: sc(8), elevation: 3,
  },
  miniCardTitle: { fontSize: sc(15), fontWeight: '800', color: T1 },
  miniCardSub: { fontSize: sc(11), color: BLUE_MID, fontWeight: '500' },
  miniCardRating: { fontSize: sc(32), fontWeight: '900', color: T1, letterSpacing: -1 },
  miniCardStars: { flexDirection: 'row', gap: sc(2) },
  momentsCount: { fontSize: sc(15), fontWeight: '700', color: T1 },

  // ── VIP / 학생증 인증 카드 ──
  vipCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: sc(16), marginBottom: sc(12),
    borderRadius: sc(20), padding: sc(20),
    borderWidth: 1, borderColor: BORDER,
  },
  vipCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: sc(14),
  },
  vipCardTitle: { fontSize: sc(15), fontWeight: '800', color: T1 },
  vipColumnHeaders: { flexDirection: 'row', gap: sc(28) },
  vipColFree: { fontSize: sc(13), color: BLUE_MID, fontWeight: '600', width: sc(48), textAlign: 'center' },
  vipColVip: { fontSize: sc(13), color: BLUE, fontWeight: '700', width: sc(40), textAlign: 'center' },
  vipRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: sc(8), borderTopWidth: 1, borderTopColor: BORDER,
  },
  vipFeature: { flex: 1, fontSize: sc(13), color: T1 },
  vipFreeVal: { fontSize: sc(12), color: BLUE_MID, width: sc(48), textAlign: 'center' },
  vipVipVal: { fontSize: sc(12), fontWeight: '700', color: BLUE, width: sc(40), textAlign: 'center' },
  vipCheck: { width: sc(40), textAlign: 'center' },

  // ── 메뉴 카드 ──
  menuCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: sc(16), marginBottom: sc(12),
    borderRadius: sc(16),
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(2) },
    shadowOpacity: 0.08, shadowRadius: sc(8), elevation: 3,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: sc(16), paddingVertical: sc(15), gap: sc(12),
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  menuIconWrap: {
    width: sc(34), height: sc(34), borderRadius: sc(10),
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  menuText: { flex: 1, fontSize: sc(15), color: T1, fontWeight: '600' },

  logoutButton: {
    marginHorizontal: sc(16), marginTop: sc(4),
    padding: sc(15), borderRadius: sc(14),
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(2) },
    shadowOpacity: 0.08, shadowRadius: sc(8), elevation: 3,
  },
  logoutText: { fontSize: sc(15), fontWeight: '700', color: '#EF4444' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: sc(24), borderTopRightRadius: sc(24),
    paddingHorizontal: sc(16), paddingBottom: sc(40), paddingTop: sc(12),
  },
  bottomSheetHandle: {
    width: sc(40), height: sc(4), borderRadius: sc(2),
    backgroundColor: BORDER,
    alignSelf: 'center', marginBottom: sc(16),
  },
  bottomSheetTitle: {
    fontSize: sc(16), fontWeight: '800', color: T1,
    textAlign: 'center', marginBottom: sc(20),
  },
  bottomSheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: sc(12),
    paddingVertical: sc(14), paddingHorizontal: sc(4),
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  bottomSheetIconWrap: {
    width: sc(40), height: sc(40), borderRadius: sc(12),
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  bottomSheetItemText: { fontSize: sc(15), color: T1, fontWeight: '500' },
  bottomSheetCancel: {
    marginTop: sc(12), paddingVertical: sc(14),
    alignItems: 'center',
    backgroundColor: BLUE_L, borderRadius: sc(12),
  },
  bottomSheetCancelText: { fontSize: sc(15), color: BLUE_MID, fontWeight: '600' },

  bioInput: {
    backgroundColor: BLUE_BG,
    borderRadius: sc(12), borderWidth: 1, borderColor: BORDER,
    padding: sc(14), fontSize: sc(14), color: T1,
    minHeight: sc(100), textAlignVertical: 'top', lineHeight: sc(20),
    marginBottom: sc(6),
  },
  bioButtonRow: { flexDirection: 'row', gap: sc(10) },
  bioCancelButton: {
    flex: 1, paddingVertical: sc(14), borderRadius: sc(12),
    alignItems: 'center', backgroundColor: BLUE_L,
  },
  bioCancelText: { fontSize: sc(15), color: BLUE_MID, fontWeight: '600' },
  bioSaveButton: {
    flex: 2, paddingVertical: sc(14), borderRadius: sc(12),
    alignItems: 'center', backgroundColor: BLUE,
  },
  bioSaveText: { fontSize: sc(15), color: '#FFFFFF', fontWeight: '700' },

  profileModalFull: {
    flex: 1, backgroundColor: '#fff',
  },
  profileCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? sc(56) : sc(24),
    left: sc(16),
    zIndex: 100,
    width: sc(40), height: sc(40), borderRadius: sc(20),
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: sc(8), elevation: 5,
  },
  profileSaveFloatBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? sc(56) : sc(24),
    right: sc(16),
    zIndex: 100,
    paddingHorizontal: sc(18), paddingVertical: sc(10),
    borderRadius: sc(20),
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: sc(8), elevation: 5,
  },
  profileModalSaveBtn: { fontSize: sc(16), fontWeight: '800', color: BLUE },

  profileScroll:        { flex: 1 },
  profileScrollContent: { paddingHorizontal: sc(16), paddingTop: sc(100), paddingBottom: sc(16) },

  editSection: {
    backgroundColor: '#fff', borderRadius: sc(20), padding: sc(16),
    shadowColor: '#000', shadowOffset: { width: 0, height: sc(4) },
    shadowOpacity: 0.12, shadowRadius: sc(12), elevation: 6,
  },
  editSectionTitle:   { fontSize: sc(18), fontWeight: '800', color: T1 },
  editDivider:        { height: 1, backgroundColor: '#D4E4FF', marginTop: sc(10), marginBottom: sc(12) },
  editSectionDivider: { height: 1, backgroundColor: '#D4E4FF', marginVertical: sc(20) },
  editSectionSub:     { fontSize: sc(13), color: BLUE_MID, marginBottom: sc(12) },
  editOptional:       { fontSize: sc(13), fontWeight: '500', color: BLUE_MID },
  editRowBetween:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  editFieldWrap: {},
  editFieldLabel: { fontSize: sc(13), fontWeight: '700', color: T1, marginBottom: sc(8) },
  editInput: {
    fontSize: sc(15), color: T1,
    paddingVertical: sc(12), paddingHorizontal: sc(14),
    borderWidth: 1, borderColor: '#D4E4FF', borderRadius: sc(12), backgroundColor: '#F0F4FA',
  },
  editTextarea: {
    fontSize: sc(15), color: T1,
    marginTop: sc(10),
    paddingVertical: sc(14), paddingHorizontal: sc(14),
    borderWidth: 1, borderColor: '#D4E4FF', borderRadius: sc(12), backgroundColor: '#F0F4FA',
    height: sc(56), lineHeight: sc(22), textAlignVertical: 'top',
  },

  chipRow:             { flexDirection: 'row', flexWrap: 'wrap', gap: sc(8) },
  optionChip: {
    paddingHorizontal: sc(18), paddingVertical: sc(10),
    borderRadius: sc(20), borderWidth: 1.5, borderColor: '#D4E4FF', backgroundColor: '#F0F4FA',
  },
  optionChipActive:     { borderColor: BLUE, backgroundColor: BLUE_L },
  optionChipText:       { fontSize: sc(13), fontWeight: '600', color: BLUE_MID },
  optionChipTextActive: { color: BLUE, fontWeight: '700' },

  profileFooter: {
    paddingHorizontal: sc(32),
    paddingTop: sc(12),
    paddingBottom: Platform.OS === 'ios' ? sc(32) : sc(16),
    backgroundColor: '#fff',
  },
  profileSaveBtn: {
    backgroundColor: BLUE, paddingVertical: sc(16), borderRadius: sc(30), alignItems: 'center',
    shadowColor: BLUE, shadowOffset: { width: 0, height: sc(6) },
    shadowOpacity: 0.35, shadowRadius: sc(20), elevation: 8,
  },
  profileSaveBtnText: { color: '#fff', fontSize: sc(18), fontWeight: '800', letterSpacing: -0.3 },

  profileSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: sc(16),
    paddingTop: Platform.OS === 'ios' ? sc(60) : sc(40),
    paddingBottom: sc(40),
  },
  profileFieldWrap: { marginBottom: sc(18) },
  profileFieldLabel: { fontSize: sc(13), color: T1, fontWeight: '700', marginBottom: sc(8) },
  profileFieldInput: {
    backgroundColor: BLUE_BG, borderRadius: sc(12), borderWidth: 1,
    borderColor: BORDER, paddingHorizontal: sc(14), paddingVertical: sc(12),
    fontSize: sc(14), color: T1,
  },

  genderRow: { flexDirection: 'row', gap: sc(10) },
  genderButton: {
    flex: 1, paddingVertical: sc(12), borderRadius: sc(12),
    alignItems: 'center', backgroundColor: BLUE_BG,
    borderWidth: 1.5, borderColor: BORDER,
  },
  genderButtonActive: { backgroundColor: BLUE_L, borderColor: BLUE },
  genderButtonText: { fontSize: sc(14), color: BLUE_MID, fontWeight: '600' },
  genderButtonTextActive: { color: BLUE },

  hobbyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: sc(6), marginBottom: sc(8) },
  hobbyCount: { fontSize: sc(12), color: BLUE_MID, fontWeight: '500' },
  hobbyTagList: { flexDirection: 'row', flexWrap: 'wrap', gap: sc(6), marginBottom: sc(10) },
  hobbyTagEdit: {
    flexDirection: 'row', alignItems: 'center', gap: sc(4),
    backgroundColor: BLUE_L, borderRadius: sc(20),
    paddingHorizontal: sc(10), paddingVertical: sc(5),
    borderWidth: 1, borderColor: BORDER,
  },
  hobbyTagEditText: { fontSize: sc(12), color: BLUE, fontWeight: '700' },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sc(8) },
  langChip: {
    paddingHorizontal: sc(12), paddingVertical: sc(8), borderRadius: sc(20),
    backgroundColor: BLUE_BG, borderWidth: 1.5, borderColor: BORDER,
  },
  langChipActive: { backgroundColor: BLUE_L, borderColor: BLUE },
  langChipText: { fontSize: sc(13), color: BLUE_MID, fontWeight: '600' },
  langChipTextActive: { color: BLUE },

  hobbyInputRow: { flexDirection: 'row', gap: sc(8) },
  hobbyInputField: {
    flex: 1, backgroundColor: BLUE_BG, borderRadius: sc(12),
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: sc(14), paddingVertical: sc(12),
    fontSize: sc(14), color: T1,
  },
  hobbyAddButton: {
    paddingHorizontal: sc(16), paddingVertical: sc(12), borderRadius: sc(12),
    backgroundColor: BLUE, justifyContent: 'center',
  },
  hobbyAddButtonText: { fontSize: sc(14), color: '#FFFFFF', fontWeight: '700' },

  studentIdApproved: {
    flexDirection: 'row', alignItems: 'center', gap: sc(8),
    marginTop: sc(14), paddingTop: sc(12), borderTopWidth: 1, borderTopColor: BORDER,
  },
  studentIdApprovedText: { fontSize: sc(14), color: '#22c55e', fontWeight: '700' },
  studentIdPending: {
    flexDirection: 'row', alignItems: 'center', gap: sc(8),
    marginTop: sc(14), paddingTop: sc(12), borderTopWidth: 1, borderTopColor: BORDER,
  },
  studentIdPendingText: { fontSize: sc(14), color: '#f59e0b', fontWeight: '600' },
  studentIdButton: {
    backgroundColor: BLUE, borderRadius: sc(12),
    paddingVertical: sc(12), alignItems: 'center', marginTop: sc(14),
  },
  studentIdButtonText: { fontSize: sc(14), color: '#FFFFFF', fontWeight: '700' },
});
