// 마이페이지 화면
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
      : { icon: 'document-text-outline' as const, label: '내 도움 요청', route: '/my-requests' },
    { icon: 'star-outline' as const, label: '후기 관리', route: null },
    { icon: 'settings-outline' as const, label: '설정', route: null },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* 프로필 카드 */}
      <View style={styles.profileCard}>
        {/* 프로필 이미지 */}
        <TouchableOpacity style={styles.avatarWrapper} onPress={() => setImageMenuVisible(true)} activeOpacity={0.8}>
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
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <Text style={[styles.nickname, { color: nicknameColor }]}>
          {user?.nickname ?? '사용자'}{user?.age ? `(${user.age})` : ''}
        </Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {user?.userType === 'INTERNATIONAL' ? '🌍 유학생' : user?.userType === 'EXCHANGE' ? '✈️ 교환학생' : '🇰🇷 한국인 학생'}
          </Text>
        </View>
        <Text style={styles.university}>
          {user?.university ?? '국민대학교'}{user?.major ? `(${user.major})` : ''}
        </Text>

        {user?.bio ? (
          <Text style={styles.detailBio}>{user.bio}</Text>
        ) : null}

        {user?.mbti ? (
          <View style={styles.mbtiBlock}>
            <Text style={styles.detailLabel}>MBTI</Text>
            <Text style={styles.detailValue}>{user.mbti}</Text>
          </View>
        ) : null}

        {userHobbies.length > 0 && (
          <View style={styles.hobbyBlock}>
            <Text style={styles.detailLabel}>취미</Text>
            <View style={styles.hobbyRow}>
              {userHobbies.map((h) => (
                <View key={h} style={styles.hobbyTag}>
                  <Text style={styles.hobbyTagText}>#{h}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.profileCompleteButton} onPress={handleOpenProfileModal} activeOpacity={0.8}>
          <Ionicons name={filledCount >= 6 ? 'create-outline' : 'person-add-outline'} size={15} color={BLUE} />
          <Text style={styles.profileCompleteText}>
            {filledCount >= 6 ? '프로필 수정하기' : `프로필 완성하기 (${filledCount}/6)`}
          </Text>
        </TouchableOpacity>

        {/* 통계 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.rating?.toFixed(1) ?? '0.0'}</Text>
            <Text style={styles.statLabel}>평점</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{isKorean ? helpHistory.filter((h) => h.status === 'COMPLETED').length : myRequests.filter((r) => r.status === 'COMPLETED').length}</Text>
            <Text style={styles.statLabel}>{isKorean ? '도움 횟수' : '받은 도움'}</Text>
          </View>
        </View>
      </View>

      {/* 메뉴 */}
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

      {/* 로그아웃 */}
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
  container: { flex: 1, backgroundColor: BLUE_BG },
  scrollContent: { paddingTop: Platform.OS === 'ios' ? 60 : 32, paddingBottom: 32 },

  profileCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImageOverlay: {
    width: 80, height: 80, borderRadius: 40,
    position: 'absolute', top: 0, left: 0,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  nickname: { fontSize: 22, fontWeight: '900', color: T1, marginBottom: 6, letterSpacing: -0.5 },
  typeBadge: {
    backgroundColor: BLUE_L, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, marginBottom: 6,
    borderWidth: 1, borderColor: BORDER,
  },
  typeBadgeText: { fontSize: 13, color: BLUE, fontWeight: '700' },
  university: { fontSize: 13, color: BLUE_MID, marginBottom: 10, fontWeight: '500' },

  detailBio: {
    fontSize: 13, color: T1, lineHeight: 18,
    marginBottom: 10, textAlign: 'center',
  },

  profileCompleteButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BLUE_L,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 10,
    marginBottom: 18,
  },
  profileCompleteText: { fontSize: 13, color: BLUE, fontWeight: '700' },

  detailLabel: { fontSize: 11, color: BLUE_MID, marginBottom: 3, fontWeight: '500' },
  detailValue: { fontSize: 13, color: T1, fontWeight: '700' },
  mbtiBlock:   { alignItems: 'center', marginBottom: 8 },
  hobbyBlock:  { alignItems: 'center', marginBottom: 12 },
  hobbyRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 },
  hobbyTag: {
    backgroundColor: BLUE_L, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: BORDER,
  },
  hobbyTagText: { fontSize: 12, color: BLUE, fontWeight: '700' },

  statsRow:    { flexDirection: 'row', alignItems: 'center', gap: 32 },
  statItem:    { alignItems: 'center' },
  statNumber:  { fontSize: 24, fontWeight: '900', color: T1, letterSpacing: -0.5 },
  statLabel:   { fontSize: 12, color: BLUE_MID, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, height: 32, backgroundColor: BORDER },

  menuCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
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
    marginHorizontal: 16, marginTop: 16,
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
});
