// 마이페이지 화면
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { useAuthStore } from '../../stores/authStore';
import { useHelpHistoryStore } from '../../stores/helpHistoryStore';
import { useHelpRequestStore } from '../../stores/helpRequestStore';

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

function getLevel(count: number): { label: string; color: string; bg: string } {
  if (count >= 31) return { label: '마스터', color: '#F97316', bg: '#FFF7ED' };
  if (count >= 16) return { label: '전문가', color: '#8B5CF6', bg: '#F5F3FF' };
  if (count >= 6)  return { label: '도우미', color: '#3B6FE8', bg: '#EEF4FF' };
  return                  { label: '새싹',   color: '#22C55E', bg: '#F0FDF4' };
}

const COLOR_MALE   = '#0EA5E9';
const COLOR_FEMALE = '#DB2777';

const LANGUAGES = [
  { code: 'en',      label: '🇺🇸 English' },
  { code: 'zh-Hans', label: '🇨🇳 中文(简体)' },
  { code: 'zh-Hant', label: '🇹🇼 中文(繁體)' },
  { code: 'ja',      label: '🇯🇵 日本語' },
  { code: 'vi',      label: '🇻🇳 Tiếng Việt' },
  { code: 'mn',      label: '🇲🇳 Монгол' },
  { code: 'fr',      label: '🇫🇷 Français' },
  { code: 'de',      label: '🇩🇪 Deutsch' },
  { code: 'es',      label: '🇪🇸 Español' },
  { code: 'ru',      label: '🇷🇺 Русский' },
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
  const { myRequests, fetchMyRequests } = useHelpRequestStore();
  const [imageMenuVisible, setImageMenuVisible] = useState(false);

  const isKorean = user?.userType === 'KOREAN';

  useEffect(() => {
    loadUser();
    if (isKorean) fetchHelpHistory();
    else fetchMyRequests();
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
    { icon: 'star-outline' as const, label: '후기 관리', route: null },
    { icon: 'settings-outline' as const, label: '계정 설정', route: null },
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
            <View style={styles.flagBadge}>
              <Text style={styles.flagText}>
                {user?.userType === 'KOREAN' ? '🇰🇷' : user?.userType === 'EXCHANGE' ? '✈️' : '🌍'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <View style={styles.nicknameRow}>
              <Text style={[styles.nickname, { color: '#111111' }]}>
                {user?.nickname ?? '사용자'}
              </Text>
              {(() => {
                const helpCount = isKorean
                  ? helpHistory.filter((h) => h.status === 'COMPLETED').length
                  : myRequests.filter((r) => r.status === 'COMPLETED').length;
                const lv = getLevel(helpCount);
                return (
                  <View style={[styles.levelBadge, { backgroundColor: lv.bg }]}>
                    <Text style={[styles.levelBadgeText, { color: lv.color }]}>{lv.label}</Text>
                  </View>
                );
              })()}
            </View>
            <View style={styles.handleRow}>
              {user?.major ? (
                <Text style={styles.handleText}>{user.major}</Text>
              ) : null}
              {user?.studentIdVerified && <VerifiedBadge size="sm" />}
            </View>
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={handleOpenProfileModal} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={14} color="#fff" />
            <Text style={styles.editBtnText}> 수정</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* ── 활동 카드 ── */}
      {(() => {
        const helpCount = isKorean
          ? helpHistory.filter((h) => h.status === 'COMPLETED').length
          : myRequests.filter((r) => r.status === 'COMPLETED').length;
        const MONTHLY_GOAL = 20;
        const progress = Math.min(helpCount / MONTHLY_GOAL, 1);
        const DOTS = 9;
        return (
          <View style={styles.activityCard}>
            {/* 상단: 연속 도움중 + 점들 */}
            <View style={styles.activityTopRow}>
              <View style={styles.activityFireWrap}>
                <Text style={styles.activityFireIcon}>🔥</Text>
              </View>
              <View style={styles.activityStreakWrap}>
                <Text style={styles.activityStreak}>{helpCount}일 연속 도움중!</Text>
                <Text style={styles.activitySub}>오늘도 도움을 드려보세요</Text>
              </View>
              <View style={styles.activityDots}>
                {Array.from({ length: DOTS }).map((_, i) => (
                  <View key={i} style={[styles.activityDot, i < Math.round(progress * DOTS) && styles.activityDotOn]} />
                ))}
              </View>
            </View>
            {/* 하단: 이번달 목표 + 게이지바 */}
            <View style={styles.activityProgressWrap}>
              <View style={styles.activityProgressLabelRow}>
                <Text style={styles.activityProgressLabel}>이번달 도움 목표</Text>
                <Text style={styles.activityProgressCount}>{helpCount} / {MONTHLY_GOAL}</Text>
              </View>
              <View style={styles.activityProgressTrack}>
                <View style={[styles.activityProgressFill, { width: `${progress * 100}%` as `${number}%` }]} />
              </View>
            </View>
          </View>
        );
      })()}

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
            <Text style={styles.bottomSheetTitle}>프로필 사진 변경</Text>

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
                <Text style={[styles.bottomSheetItemText, { color: '#EF4444' }]}>프로필 사진 삭제</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.bottomSheetCancel} onPress={() => setImageMenuVisible(false)} activeOpacity={0.7}>
              <Text style={styles.bottomSheetCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>


      {/* 프로필 상세 편집 모달 */}
      <Modal transparent animationType="slide" visible={profileModalVisible} onRequestClose={() => setProfileModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <View style={styles.profileSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>프로필 완성하기</Text>
            <ScrollView showsVerticalScrollIndicator={false}>

              <View style={styles.profileFieldWrap}>
                <View style={styles.hobbyLabelRow}>
                  <Text style={styles.profileFieldLabel}>자기소개</Text>
                  <Text style={styles.hobbyCount}>{profileInput.bio.length}/100</Text>
                </View>
                <TextInput
                  style={styles.bioInput}
                  value={profileInput.bio}
                  onChangeText={(text) => setProfileInput((prev) => ({ ...prev, bio: text }))}
                  placeholderTextColor={BLUE_MID}
                  multiline
                  maxLength={100}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.profileFieldWrap}>
                <Text style={styles.profileFieldLabel}>성별</Text>
                <View style={styles.genderRow}>
                  {['남자', '여자'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderButton, profileInput.gender === g && styles.genderButtonActive]}
                      onPress={() => setProfileInput((prev) => ({ ...prev, gender: g }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.genderButtonText, profileInput.gender === g && styles.genderButtonTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.profileFieldWrap}>
                <Text style={styles.profileFieldLabel}>나이</Text>
                <TextInput
                  style={styles.profileFieldInput}
                  value={profileInput.age}
                  onChangeText={(text) => setProfileInput((prev) => ({ ...prev, age: text.replace(/[^0-9]/g, '') }))}
                  keyboardType="numeric"
                  placeholderTextColor={BLUE_MID}
                  maxLength={3}
                />
              </View>

              <View style={styles.profileFieldWrap}>
                <Text style={styles.profileFieldLabel}>학과</Text>
                <TouchableOpacity
                  style={[styles.profileFieldInput, isKorean && { backgroundColor: BORDER, opacity: 0.7 }]}
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
                    <Text style={{ color: profileInput.major ? T1 : BLUE_MID, fontSize: 14 }}>
                      {profileInput.major || '학과를 선택하세요'}
                    </Text>
                    {isKorean
                      ? <Ionicons name="lock-closed-outline" size={16} color={BLUE_MID} />
                      : <Ionicons name={showMajorList ? 'chevron-up' : 'chevron-down'} size={16} color={BLUE_MID} />
                    }
                  </View>
                </TouchableOpacity>
                {isKorean && (
                  <Text style={{ fontSize: 11, color: BLUE_MID, marginTop: 4 }}>학생증 인증 후 변경 가능합니다.</Text>
                )}
                {showMajorList && !isKorean && (
                  <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 12, marginTop: 4, overflow: 'hidden' }}>
                    {MAJORS.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={{ paddingHorizontal: 14, paddingVertical: 11, backgroundColor: profileInput.major === item ? BLUE_L : '#fff', borderBottomWidth: 1, borderBottomColor: BORDER }}
                        onPress={() => { setProfileInput((prev) => ({ ...prev, major: item })); setShowMajorList(false); }}
                      >
                        <Text style={{ fontSize: 14, color: profileInput.major === item ? BLUE : T1, fontWeight: profileInput.major === item ? '700' : '400' }}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.profileFieldWrap}>
                <Text style={styles.profileFieldLabel}>MBTI</Text>
                <TextInput
                  style={styles.profileFieldInput}
                  value={profileInput.mbti}
                  onChangeText={(text) => setProfileInput((prev) => ({ ...prev, mbti: text.toUpperCase() }))}
                  placeholderTextColor={BLUE_MID}
                  maxLength={4}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.profileFieldWrap}>
                <Text style={styles.profileFieldLabel}>번역 언어</Text>
                <View style={styles.langGrid}>
                  {LANGUAGES.map((lang) => (
                    <TouchableOpacity
                      key={lang.code}
                      style={[styles.langChip, profileInput.preferredLanguage === lang.code && styles.langChipActive]}
                      onPress={() => setProfileInput((prev) => ({ ...prev, preferredLanguage: lang.code }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.langChipText, profileInput.preferredLanguage === lang.code && styles.langChipTextActive]}>
                        {lang.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.profileFieldWrap}>
                <View style={styles.hobbyLabelRow}>
                  <Text style={styles.profileFieldLabel}>취미</Text>
                  <Text style={styles.hobbyCount}>({profileInput.hobbies.length}/5)</Text>
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
                      returnKeyType="done"
                      placeholderTextColor={BLUE_MID}
                    />
                    <TouchableOpacity style={styles.hobbyAddButton} onPress={handleAddHobby} activeOpacity={0.8}>
                      <Text style={styles.hobbyAddButtonText}>추가</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

            </ScrollView>
            <View style={styles.bioButtonRow}>
              <TouchableOpacity style={styles.bioCancelButton} onPress={() => setProfileModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.bioCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bioSaveButton} onPress={handleSaveProfile} activeOpacity={0.8}>
                <Text style={styles.bioSaveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  scrollContent: { paddingTop: Platform.OS === 'ios' ? 55 : 28, paddingBottom: 40 },

  // ── 상단 바 ──
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F0F4FA',
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topBarIcon: { padding: 6 },
  pointBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F0A040',
    justifyContent: 'center', alignItems: 'center',
  },
  pointBadgeLabel: { fontSize: 11, fontWeight: '900', color: '#fff' },
  pointValue: { fontSize: 16, fontWeight: '700', color: T1 },

  // ── 프로필 섹션 ──
  profileSection: {
    backgroundColor: '#F0F4FA',
    marginBottom: 4,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatarWrapper: { alignItems: 'center' },
  avatarRing: {
    width: 70, height: 70, borderRadius: 35,
    borderWidth: 2, borderColor: '#D0D0D0',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImageOverlay: {
    width: 66, height: 66, borderRadius: 33,
    position: 'absolute', top: 0, left: 0,
  },
  avatarText: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  avatarProgressLabel: { marginTop: 4 },
  flagBadge: {
    position: 'absolute', bottom: -2, left: 0,
    width: 23, height: 23, borderRadius: 11.5,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#D0D0D0',
    overflow: 'hidden',
  },
  flagText: { fontSize: 16, textAlign: 'center', includeFontPadding: false, lineHeight: 16, marginLeft: 1 },
  avatarProgressText: { fontSize: 12, fontWeight: '700', color: BLUE_MID },

  profileInfo: { flex: 1, gap: 4 },
  nicknameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  nickname: { fontSize: 24, fontWeight: '900', color: T1, letterSpacing: -0.5 },
  levelBadge: {
    borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3,
  },
  levelBadgeText: { fontSize: 14, fontWeight: '900' },

  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  handleText: { fontSize: 16, color: '#999999', fontWeight: '700' },

  followRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  followCount: { fontSize: 14, fontWeight: '700', color: T1 },
  followLabel: { fontSize: 13, color: BLUE_MID },

  editBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BLUE, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'center',
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  detailBio: { fontSize: 13, color: T1, lineHeight: 18, marginBottom: 10 },

  infoTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  typeBadge: {
    backgroundColor: BLUE_L, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
  },
  typeBadgeText: { fontSize: 12, color: BLUE, fontWeight: '600' },
  university: { fontSize: 13, color: BLUE_MID, fontWeight: '500' },

  // ── 스트릭 + 방문자 ──
  activityCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  activityHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 14, paddingBottom: 10,
  },
  activityTitle: { fontSize: 15, fontWeight: '800', color: T1 },
  activityLevelBadge: {
    borderRadius: 10, borderWidth: 1.5, width: 58, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  activityLevelText: { fontSize: 13, fontWeight: '800' },
  activityRatingRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    paddingHorizontal: 14, marginBottom: 10,
  },
  activityRatingNum: { fontSize: 44, fontWeight: '900', color: T1, letterSpacing: -2, lineHeight: 44 },
  activityStarsRow: { flexDirection: 'row', gap: 3, marginBottom: 5 },
  activityShortcuts: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: BORDER,
    paddingTop: 10, paddingBottom: 12, paddingHorizontal: 10,
  },
  activityShortcut: { flex: 1, alignItems: 'center', gap: 6 },
  activityShortcutLabel: { fontSize: 11, fontWeight: '600', color: '#333' },
  activityDivider: { width: 1, backgroundColor: BORDER, alignSelf: 'stretch', marginTop: -16, marginBottom: -18 },

  activityStreak: { fontSize: 17, fontWeight: '900', color: T1, marginBottom: 4 },
  activitySub: { fontSize: 12, color: BLUE_MID },
  activityProgressWrap: { paddingHorizontal: 14, paddingBottom: 16 },
  activityProgressTrack: {
    height: 8, borderRadius: 8, backgroundColor: '#F0F2F6', overflow: 'hidden', marginBottom: 6,
  },
  activityProgressFill: { height: '100%', borderRadius: 8 },
  activityProgressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  activityProgressStart: { fontSize: 11, color: BLUE_MID },
  activityProgressEnd: { fontSize: 11, color: BLUE_MID },

  activityTopRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, paddingBottom: 12, gap: 12,
  },
  activityFireWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#FFF3E8',
    justifyContent: 'center', alignItems: 'center',
  },
  activityFireIcon: { fontSize: 24 },
  activityStreakWrap: { flex: 1 },
  activityDots: { flexDirection: 'row', gap: 5 },
  activityDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#E8EDF5',
  },
  activityDotOn: { backgroundColor: BLUE },
  activityProgressLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  activityProgressLabel: { fontSize: 12, color: BLUE_MID, fontWeight: '600' },
  activityProgressCount: { fontSize: 12, color: BLUE_MID, fontWeight: '700' },

  // ── 모멘츠 ──
  momentsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  momentsLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  momentsIcon: { fontSize: 20 },
  momentsLabel: { fontSize: 15, fontWeight: '600', color: T1 },

  miniCardRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 16, marginBottom: 10,
  },
  miniCard: {
    flex: 1, backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: BORDER,
  },
  miniCardTitle: { fontSize: 15, fontWeight: '800', color: T1 },
  miniCardSub: { fontSize: 11, color: BLUE_MID, fontWeight: '500' },
  miniCardRating: { fontSize: 32, fontWeight: '900', color: T1, letterSpacing: -1 },
  miniCardStars: { flexDirection: 'row', gap: 2 },
  momentsCount: { fontSize: 15, fontWeight: '700', color: T1 },

  // ── VIP / 학생증 인증 카드 ──
  vipCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: BORDER,
  },
  vipCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  vipCardTitle: { fontSize: 15, fontWeight: '800', color: T1 },
  vipColumnHeaders: { flexDirection: 'row', gap: 28 },
  vipColFree: { fontSize: 13, color: BLUE_MID, fontWeight: '600', width: 48, textAlign: 'center' },
  vipColVip: { fontSize: 13, color: BLUE, fontWeight: '700', width: 40, textAlign: 'center' },
  vipRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: BORDER,
  },
  vipFeature: { flex: 1, fontSize: 13, color: T1 },
  vipFreeVal: { fontSize: 12, color: BLUE_MID, width: 48, textAlign: 'center' },
  vipVipVal: { fontSize: 12, fontWeight: '700', color: BLUE, width: 40, textAlign: 'center' },
  vipCheck: { width: 40, textAlign: 'center' },

  // ── 메뉴 카드 ──
  menuCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15, gap: 12,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  menuIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  menuText: { flex: 1, fontSize: 15, color: T1, fontWeight: '600' },

  logoutButton: {
    marginHorizontal: 16, marginTop: 4,
    padding: 15, borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12,
  },
  bottomSheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: 'center', marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 16, fontWeight: '800', color: T1,
    textAlign: 'center', marginBottom: 20,
  },
  bottomSheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  bottomSheetIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  bottomSheetItemText: { fontSize: 15, color: T1, fontWeight: '500' },
  bottomSheetCancel: {
    marginTop: 12, paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: BLUE_L, borderRadius: 12,
  },
  bottomSheetCancelText: { fontSize: 15, color: BLUE_MID, fontWeight: '600' },

  bioInput: {
    backgroundColor: BLUE_BG,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 14, fontSize: 14, color: T1,
    minHeight: 100, textAlignVertical: 'top', lineHeight: 20,
    marginBottom: 6,
  },
  bioButtonRow: { flexDirection: 'row', gap: 10 },
  bioCancelButton: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', backgroundColor: BLUE_L,
  },
  bioCancelText: { fontSize: 15, color: BLUE_MID, fontWeight: '600' },
  bioSaveButton: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', backgroundColor: BLUE,
  },
  bioSaveText: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },

  profileSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12,
    maxHeight: '85%',
  },
  profileFieldWrap: { marginBottom: 18 },
  profileFieldLabel: { fontSize: 13, color: T1, fontWeight: '700', marginBottom: 8 },
  profileFieldInput: {
    backgroundColor: BLUE_BG, borderRadius: 12, borderWidth: 1,
    borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: T1,
  },

  genderRow: { flexDirection: 'row', gap: 10 },
  genderButton: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    alignItems: 'center', backgroundColor: BLUE_BG,
    borderWidth: 1.5, borderColor: BORDER,
  },
  genderButtonActive: { backgroundColor: BLUE_L, borderColor: BLUE },
  genderButtonText: { fontSize: 14, color: BLUE_MID, fontWeight: '600' },
  genderButtonTextActive: { color: BLUE },

  hobbyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  hobbyCount: { fontSize: 12, color: BLUE_MID, fontWeight: '500' },
  hobbyTagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  hobbyTagEdit: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: BLUE_L, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: BORDER,
  },
  hobbyTagEditText: { fontSize: 12, color: BLUE, fontWeight: '700' },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: BLUE_BG, borderWidth: 1.5, borderColor: BORDER,
  },
  langChipActive: { backgroundColor: BLUE_L, borderColor: BLUE },
  langChipText: { fontSize: 13, color: BLUE_MID, fontWeight: '600' },
  langChipTextActive: { color: BLUE },

  hobbyInputRow: { flexDirection: 'row', gap: 8 },
  hobbyInputField: {
    flex: 1, backgroundColor: BLUE_BG, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: T1,
  },
  hobbyAddButton: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    backgroundColor: BLUE, justifyContent: 'center',
  },
  hobbyAddButtonText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },

  studentIdApproved: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER,
  },
  studentIdApprovedText: { fontSize: 14, color: '#22c55e', fontWeight: '700' },
  studentIdPending: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER,
  },
  studentIdPendingText: { fontSize: 14, color: '#f59e0b', fontWeight: '600' },
  studentIdButton: {
    backgroundColor: BLUE, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginTop: 14,
  },
  studentIdButtonText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
});
