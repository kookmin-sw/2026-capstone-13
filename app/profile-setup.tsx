// 신규 사용자 프로필 설정 화면 (마이페이지 프로필 수정과 동일한 UI)
import { Ionicons } from '@expo/vector-icons';
import { s as sc } from '../utils/scale';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';

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

const LANGUAGES = [
  { code: 'en',      label: '🇺🇸 English' },
  { code: 'ja',      label: '🇯🇵 日本語' },
  { code: 'zh-Hans', label: '🇨🇳 中文(简体)' },
  { code: 'ru',      label: '🇷🇺 Русский' },
  { code: 'mn',      label: '🇲🇳 Монгол' },
  { code: 'vi',      label: '🇻🇳 Tiếng Việt' },
];

const BLUE     = '#3B6FE8';
const BLUE_BG  = '#F5F8FF';
const BLUE_L   = '#EEF4FF';
const BLUE_MID = '#A8C8FA';
const BORDER   = '#D4E4FA';
const T1       = '#0E1E40';

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

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user, updateProfileImage, updateProfileDetail } = useAuthStore();

  const [profileInput, setProfileInput] = useState<ProfileDetail>(EMPTY_DETAIL);
  const [hobbyInput, setHobbyInput] = useState('');
  const [showMajorList, setShowMajorList] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageMenuVisible, setImageMenuVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const isKorean = user?.userType === 'KOREAN';

  const scrollToIndex = (ref: React.RefObject<ScrollView>, index: number, animated = true) => {
    ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated });
  };

  const handleOpenBirthModal = () => {
    setBirthYear(savedBirthYear);
    setBirthMonth(savedBirthMonth);
    setBirthDay(savedBirthDay);
    setBirthModalVisible(true);
    setTimeout(() => {
      scrollToIndex(yearRef, YEARS.indexOf(savedBirthYear), false);
      scrollToIndex(monthRef, savedBirthMonth - 1, false);
      scrollToIndex(dayRef, savedBirthDay - 1, false);
    }, 50);
  };

  const handleConfirmBirth = () => {
    const today = new Date();
    const birth = new Date(birthYear, birthMonth - 1, birthDay);
    let age = today.getFullYear() - birth.getFullYear();
    const notYet =
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
    if (notYet) age -= 1;
    setSavedBirthYear(birthYear);
    setSavedBirthMonth(birthMonth);
    setSavedBirthDay(birthDay);
    setProfileInput((prev) => ({ ...prev, age: String(age) }));
    setBirthModalVisible(false);
  };

  const handleAddHobby = () => {
    const tag = hobbyInput.trim();
    if (!tag || profileInput.hobbies.length >= 5) return;
    if (profileInput.hobbies.includes(tag)) return;
    setProfileInput((prev) => ({ ...prev, hobbies: [...prev.hobbies, tag] }));
    setHobbyInput('');
  };

  const handleRemoveHobby = (index: number) => {
    setProfileInput((prev) => ({ ...prev, hobbies: prev.hobbies.filter((_, i) => i !== index) }));
  };

  const handlePickImage = async (type: 'camera' | 'gallery') => {
    setImageMenuVisible(false);
    const result = type === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0].uri) {
      await updateProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfileDetail({
        bio: profileInput.bio,
        gender: profileInput.gender,
        age: profileInput.age,
        major: profileInput.major,
        mbti: profileInput.mbti,
        hobbies: profileInput.hobbies.join(','),
        preferredLanguage: profileInput.preferredLanguage,
      });
      router.replace('/(main)/home');
    } catch {
      Alert.alert('오류', '프로필 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* 헤더 버튼 */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Ionicons name="close" size={24} color={T1} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.saveFloatBtn} onPress={handleSave} disabled={isSaving} activeOpacity={0.7}>
        <Text style={styles.saveFloatText}>{isSaving ? '저장 중...' : '저장'}</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* 프로필 사진 */}
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

        <View style={styles.divider} />

        {/* 한줄 소개 */}
        <Text style={styles.sectionTitle}>한줄 소개</Text>
        <TextInput
          style={styles.textarea}
          value={profileInput.bio}
          onChangeText={(text) => setProfileInput((prev) => ({ ...prev, bio: text }))}
          placeholder={'간단히 나를 소개해보세요.\n소개말이 있으면 호감도가 올라가요.'}
          placeholderTextColor={BLUE_MID}
          multiline
          maxLength={100}
          textAlignVertical="top"
        />

        <View style={styles.divider} />

        {/* 기본 정보 */}
        <Text style={styles.sectionTitle}>기본 정보</Text>

        {/* 성별 */}
        <View style={[styles.rowBetween, { marginTop: sc(12) }]}>
          <Text style={styles.fieldLabel}>성별</Text>
          <View style={styles.chipRow}>
            {[{ label: '남성', value: '남자' }, { label: '여성', value: '여자' }].map(({ label, value }) => {
              const isSelected = profileInput.gender === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.optionChip, isSelected && styles.optionChipActive]}
                  onPress={() => setProfileInput((prev) => ({ ...prev, gender: value }))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionChipText, isSelected && styles.optionChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* 나이 */}
        <View style={styles.rowBetween}>
          <Text style={styles.fieldLabel}>나이</Text>
          <TouchableOpacity
            style={[styles.editInput, { marginLeft: sc(12), paddingHorizontal: sc(10) }]}
            onPress={handleOpenBirthModal}
            activeOpacity={0.8}
          >
            <Text style={{ color: profileInput.age ? T1 : BLUE_MID, fontSize: sc(15) }}>
              {profileInput.age ? `${savedBirthYear}년 ${savedBirthMonth}월 ${savedBirthDay}일 (만 ${profileInput.age}세)` : '생년월일을 선택하세요'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* 학과 */}
        <View style={styles.fieldWrap}>
          <View style={styles.rowBetween}>
            <Text style={styles.fieldLabel}>학과</Text>
            <TouchableOpacity
              style={[styles.editInput, { marginLeft: sc(12), minWidth: sc(160), maxWidth: sc(200), paddingHorizontal: sc(10) }, isKorean && { backgroundColor: BORDER, opacity: 0.7 }]}
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
                <Ionicons name={showMajorList ? 'chevron-up' : 'chevron-down'} size={16} color={BLUE_MID} />
              </View>
            </TouchableOpacity>
          </View>
          {showMajorList && (
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

        <View style={styles.divider} />

        {/* 번역 언어 */}
        <Text style={styles.sectionTitle}>번역 언어</Text>
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

        <View style={styles.divider} />

        {/* 취미 */}
        <View style={[styles.rowBetween, { marginBottom: sc(12) }]}>
          <Text style={styles.sectionTitle}>취미</Text>
          <Text style={{ fontSize: sc(13), fontWeight: '500', color: BLUE_MID }}>({profileInput.hobbies.length}/5)</Text>
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

      {/* 사진 선택 오버레이 */}
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
            <View style={{ height: PICKER_HEIGHT, flexDirection: 'row', gap: sc(8), paddingHorizontal: sc(8) }}>
              {/* 년 */}
              <View style={{ flex: 1, position: 'relative' }}>
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT, borderRadius: sc(10), borderWidth: 1.5, borderColor: BLUE, zIndex: 1 }} />
                <ScrollView ref={yearRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} snapToInterval={ITEM_HEIGHT} decelerationRate="fast" contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                  onMomentumScrollEnd={(e) => { const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT); setBirthYear(YEARS[Math.max(0, Math.min(idx, YEARS.length - 1))]); }}>
                  {YEARS.map((y) => (
                    <View key={y} style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: sc(15), color: birthYear === y ? BLUE : '#999', fontWeight: birthYear === y ? '700' : '400' }}>{y}년</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
              {/* 월 */}
              <View style={{ flex: 1, position: 'relative' }}>
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT, borderRadius: sc(10), borderWidth: 1.5, borderColor: BLUE, zIndex: 1 }} />
                <ScrollView ref={monthRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} snapToInterval={ITEM_HEIGHT} decelerationRate="fast" contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                  onMomentumScrollEnd={(e) => { const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT); setBirthMonth(idx + 1); }}>
                  {MONTHS.map((m) => (
                    <View key={m} style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: sc(15), color: birthMonth === m ? BLUE : '#999', fontWeight: birthMonth === m ? '700' : '400' }}>{m}월</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
              {/* 일 */}
              <View style={{ flex: 1, position: 'relative' }}>
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT, borderRadius: sc(10), borderWidth: 1.5, borderColor: BLUE, zIndex: 1 }} />
                <ScrollView ref={dayRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} snapToInterval={ITEM_HEIGHT} decelerationRate="fast" contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                  onMomentumScrollEnd={(e) => { const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT); const days = getDays(birthYear, birthMonth); setBirthDay(Math.max(1, Math.min(idx + 1, days))); }}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  closeBtn: {
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
  saveFloatBtn: {
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
  saveFloatText: { fontSize: sc(16), fontWeight: '800', color: BLUE },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: sc(16), paddingTop: sc(100), paddingBottom: sc(16) },

  photoMainWrap: { position: 'relative', alignSelf: 'center' },
  photoMainBox: {
    width: sc(120), height: sc(120),
    borderRadius: sc(60), overflow: 'hidden',
    backgroundColor: '#F2F2F2',
  },
  photoMainImage: { width: '100%', height: '100%' },
  photoMainPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  photoCameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: sc(32), height: sc(32), borderRadius: sc(16),
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: sc(4), elevation: 4,
  },

  divider: { height: 1, backgroundColor: '#D4E4FF', marginVertical: sc(20) },
  sectionTitle: { fontSize: sc(18), fontWeight: '800', color: T1 },
  fieldLabel: { fontSize: sc(16), fontWeight: '600', color: T1 },
  fieldWrap: {},
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  textarea: {
    fontSize: sc(15), color: T1,
    marginTop: sc(10),
    paddingVertical: sc(14), paddingHorizontal: sc(14),
    borderWidth: 1, borderColor: '#D4E4FF', borderRadius: sc(12), backgroundColor: '#F0F4FA',
    height: sc(56), lineHeight: sc(22), textAlignVertical: 'top',
  },
  editInput: {
    fontSize: sc(15), color: T1,
    paddingVertical: sc(12), paddingHorizontal: sc(14),
    borderWidth: 1, borderColor: '#D4E4FF', borderRadius: sc(12), backgroundColor: '#F0F4FA',
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: sc(8) },
  optionChip: {
    paddingHorizontal: sc(18), paddingVertical: sc(10),
    borderRadius: sc(20), borderWidth: 1.5, borderColor: '#D4E4FF', backgroundColor: '#F0F4FA',
  },
  optionChipActive: { borderColor: BLUE, backgroundColor: BLUE_L },
  optionChipText: { fontSize: sc(13), fontWeight: '600', color: BLUE_MID },
  optionChipTextActive: { color: BLUE, fontWeight: '700' },

  hobbyTagList: { flexDirection: 'row', flexWrap: 'wrap', gap: sc(6), marginBottom: sc(10) },
  hobbyTagEdit: {
    flexDirection: 'row', alignItems: 'center', gap: sc(4),
    backgroundColor: BLUE_L, borderRadius: sc(20),
    paddingHorizontal: sc(10), paddingVertical: sc(5),
    borderWidth: 1, borderColor: BORDER,
  },
  hobbyTagEditText: { fontSize: sc(12), color: BLUE, fontWeight: '700' },
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

  birthConfirmBtn: { backgroundColor: BLUE, borderRadius: sc(12), paddingVertical: sc(14), alignItems: 'center' },
  birthConfirmText: { fontSize: sc(16), fontWeight: '700', color: '#fff' },
});
