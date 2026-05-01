// 신규 사용자 프로필 설정 화면 (마이페이지 프로필 수정과 동일한 UI)
import { Ionicons } from '@expo/vector-icons';
import { s as sc } from '../utils/scale';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert, Image, Keyboard, KeyboardAvoidingView, Platform,
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
  const scrollViewRef = useRef<ScrollView>(null);

  const isKorean = user?.userType === 'KOREAN';
  const canStart = profileInput.bio.trim().length > 0 && profileInput.gender.length > 0;


  const scrollToIndex = (ref: React.RefObject<ScrollView | null>, index: number, animated = true) => {
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
    Keyboard.dismiss();
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

      <View style={styles.pageTitleWrap}>
        <Text style={styles.pageTitle}>프로필 설정하고 <Text style={{ color: BLUE }}>Tutoring</Text> 시작하기</Text>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* 프로필 사진 + 이름/학과 */}
        <View style={styles.photoRowWrap}>
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
          <View style={styles.photoInfoCol}>
            <View style={styles.photoInfoLine}>
              <Text style={styles.photoInfoName}>{user?.nickname ?? '-'}</Text>
            </View>
            <View style={styles.photoInfoLine}>
              <Text style={styles.photoInfoMajor}>{user?.major ?? '-'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 한줄 소개 */}
        <Text style={styles.sectionTitle}>한줄 소개</Text>
        <TextInput
          style={[styles.textarea, profileInput.bio && { borderColor: BLUE, borderWidth: sc(2) }]}
          value={profileInput.bio}
          onChangeText={(text) => setProfileInput((prev) => ({ ...prev, bio: text }))}
          placeholder={'간단히 나를 소개해보세요.\n소개말이 있으면 호감도가 올라가요.'}
          placeholderTextColor="#9AAABF"
          multiline
          scrollEnabled={false}
          maxLength={100}
          textAlignVertical="center"
        />

        <View style={styles.divider} />


        {/* 성별 */}
        <Text style={styles.fieldLabel}>성별</Text>
        <View style={styles.genderRow}>
          {[{ label: '남성', value: '남자' }, { label: '여성', value: '여자' }].map(({ label, value }) => {
            const isSelected = profileInput.gender === value;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.genderBtn, isSelected && styles.genderBtnActive]}
                onPress={() => setProfileInput((prev) => ({ ...prev, gender: prev.gender === value ? '' : value }))}
                activeOpacity={0.8}
              >
                <Text style={[styles.genderBtnText, isSelected && styles.genderBtnTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        {/* 키워드 */}
        <View style={[styles.rowBetween, { marginBottom: sc(8) }]}>
          <Text style={styles.sectionTitle}>키워드</Text>
          <Text style={{ fontSize: sc(13), fontWeight: '500', color: BLUE_MID }}>({profileInput.hobbies.length}/5)</Text>
        </View>
        {profileInput.hobbies.length < 5 && (
          <TextInput
            style={[styles.hobbyInputField, profileInput.hobbies.length > 0 && { borderColor: BLUE, borderWidth: sc(2) }]}
            value={hobbyInput}
            onChangeText={setHobbyInput}
            onSubmitEditing={handleAddHobby}
            placeholder="나를 표현할 수 있는 단어를 입력해주세요!"
            returnKeyType="done"
            placeholderTextColor="#9AAABF"
          />
        )}
        {profileInput.hobbies.length > 0 && (
          <View style={[styles.hobbyTagList, { marginTop: sc(10) }]}>
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

        <View style={{ height: sc(180) }} />

        <TouchableOpacity style={[styles.startBtn, !canStart && styles.startBtnDisabled]} onPress={handleSave} disabled={isSaving || !canStart} activeOpacity={canStart ? 0.85 : 1}>
          <Text style={styles.startBtnText}>{isSaving ? '저장 중...' : 'Tutoring 시작하기'}</Text>
        </TouchableOpacity>

        <View style={{ height: sc(40) }} />
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  startBtnWrap: {
    paddingHorizontal: sc(28),
    paddingBottom: Platform.OS === 'ios' ? sc(36) : sc(24),
    paddingTop: sc(12),
    backgroundColor: '#FFFFFF',
  },
  startBtn: {
    backgroundColor: BLUE,
    borderRadius: sc(14),
    paddingVertical: sc(18),
    alignItems: 'center',
  },
  startBtnDisabled: {
    backgroundColor: '#9AAABF',
  },
  startBtnText: {
    fontSize: sc(17),
    fontWeight: '700',
    color: '#FFFFFF',
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: sc(28), paddingTop: sc(28), paddingBottom: sc(16) },

  photoRowWrap: { flexDirection: 'row', alignItems: 'center', gap: sc(16), marginBottom: sc(4) },
  photoInfoCol: { flex: 1, justifyContent: 'center', gap: sc(10) },
  photoInfoLine: {
    borderBottomWidth: 1, borderBottomColor: '#D4E4FF', paddingBottom: sc(6),
  },
  photoInfoName: { fontSize: sc(20), fontWeight: '700', color: T1 },
  photoInfoMajor: { fontSize: sc(14), fontWeight: '500', color: '#6B7FA3' },
  photoMainWrap: { position: 'relative', alignSelf: 'flex-start' },
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

  divider: { height: sc(1), backgroundColor: '#E8F0FB', marginVertical: sc(14) },
  pageTitleWrap: {
    paddingHorizontal: sc(28),
    paddingTop: Platform.OS === 'ios' ? sc(72) : sc(44),
    paddingBottom: sc(16),
    backgroundColor: '#FFFFFF',
  },
  pageTitle: { fontSize: sc(28), fontWeight: '800', color: T1 },
  sectionTitle: { fontSize: sc(17), fontWeight: '700', color: T1, marginBottom: sc(8), marginTop: sc(8) },
  fieldLabel: { fontSize: sc(17), fontWeight: '700', color: T1, marginBottom: sc(8), marginTop: sc(8) },
  fieldWrap: {},
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  textarea: {
    fontSize: sc(15), color: T1,
    paddingVertical: sc(14), paddingHorizontal: sc(16),
    borderWidth: sc(1), borderColor: '#D4E4FF', borderRadius: sc(12), backgroundColor: '#FFFFFF',
    height: sc(44), textAlignVertical: 'center',
  },
  editInput: {
    flex: 1,
    fontSize: sc(15), color: T1,
    paddingVertical: sc(14), paddingHorizontal: sc(16),
    borderWidth: sc(1), borderColor: '#D4E4FF', borderRadius: sc(12), backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: sc(8) },
  optionChip: {
    paddingHorizontal: sc(18), paddingVertical: sc(10),
    borderRadius: sc(20), borderWidth: sc(1.5), borderColor: '#9AAABF', backgroundColor: '#FFFFFF',
  },
  optionChipActive: { borderColor: BLUE },
  optionChipText: { fontSize: sc(14), fontWeight: '600', color: '#6B7FA3' },
  optionChipTextActive: { color: BLUE, fontWeight: '700' },

  genderRow: { flexDirection: 'row', gap: sc(12) },
  genderBtn: {
    flex: 1,
    paddingVertical: sc(14),
    alignItems: 'center',
    borderWidth: sc(1), borderColor: '#D4E4FF', borderRadius: sc(12),
    backgroundColor: '#FFFFFF',
  },
  genderBtnActive: { borderColor: BLUE, borderWidth: sc(2) },
  genderBtnText: { fontSize: sc(15), fontWeight: '600', color: '#6B7FA3' },
  genderBtnTextActive: { color: BLUE, fontWeight: '700' },
  fixedField: {
    paddingVertical: sc(14), paddingHorizontal: sc(16),
    borderWidth: sc(1), borderColor: BLUE, borderRadius: sc(12),
    backgroundColor: '#F5F7FA',
  },
  fixedFieldText: {
    fontSize: sc(15), color: T1, fontWeight: '500',
  },
  hobbyTagList: { flexDirection: 'row', flexWrap: 'wrap', gap: sc(6), marginBottom: sc(10) },
  hobbyTagEdit: {
    flexDirection: 'row', alignItems: 'center', gap: sc(6),
    backgroundColor: BLUE_L, borderRadius: sc(10),
    paddingHorizontal: sc(14), paddingVertical: sc(10),
    borderWidth: 1, borderColor: BORDER,
  },
  hobbyTagEditText: { fontSize: sc(12), color: BLUE, fontWeight: '700' },
  hobbyInputRow: { flexDirection: 'row', gap: sc(8) },
  hobbyInputField: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: sc(12),
    borderWidth: sc(1), borderColor: '#D4E4FF',
    paddingHorizontal: sc(16), paddingVertical: sc(14),
    fontSize: sc(15), color: T1,
  },
  hobbyAddButton: {
    paddingHorizontal: sc(20), paddingVertical: sc(14), borderRadius: sc(12),
    backgroundColor: '#FFFFFF',
    borderWidth: sc(1), borderColor: '#D4E4FF',
    justifyContent: 'center',
  },
  hobbyAddButtonText: { fontSize: sc(14), color: BLUE, fontWeight: '700' },

  inlineOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  inlineSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: sc(36), borderTopRightRadius: sc(36),
    paddingHorizontal: sc(16), paddingBottom: sc(40), paddingTop: sc(12),
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
  },
  bottomSheetHandle: {
    width: sc(40), height: sc(4), borderRadius: sc(2),
    backgroundColor: BORDER,
    alignSelf: 'center', marginBottom: sc(16),
  },
  bottomSheetTitle: {
    fontSize: sc(17), fontWeight: '700', color: T1,
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

  birthConfirmBtn: { backgroundColor: BLUE, borderRadius: sc(14), paddingVertical: sc(16), alignItems: 'center' },
  birthConfirmText: { fontSize: sc(16), fontWeight: '700', color: '#fff' },
});
