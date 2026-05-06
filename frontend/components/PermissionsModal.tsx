import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { s } from '../utils/scale';

const ITEMS = [
  { icon: 'notifications-outline', label: '알림', desc: '채팅 메시지, 도움 요청 수락/거절 알림' },
  { icon: 'camera-outline',        label: '카메라', desc: '화상통화 및 프로필·게시글 사진 촬영' },
  { icon: 'mic-outline',           label: '마이크', desc: '화상통화 및 음성통화' },
  { icon: 'image-outline',         label: '사진 및 동영상', desc: '프로필·게시글 사진 업로드' },
] as const;

interface Props {
  visible: boolean;
  onConfirm: () => void;
}

export default function PermissionsModal({ visible, onConfirm }: Props) {
  if (!visible) return null;
  return (
    <View style={st.overlay}>
      <View style={st.card}>
        <Text style={st.title}>원활한 서비스 사용을 위해{'\n'}아래 권한을 확인 해주세요</Text>
        <View style={st.divider} />
        {ITEMS.map((item) => (
          <View key={item.label} style={st.row}>
            <View style={st.iconWrap}>
              <Ionicons name={item.icon as never} size={22} color="#3B6FE8" />
            </View>
            <View style={st.textWrap}>
              <Text style={st.label}>{item.label}</Text>
              <Text style={st.desc}>{item.desc}</Text>
            </View>
          </View>
        ))}
        <TouchableOpacity style={st.btn} onPress={onConfirm} activeOpacity={0.8}>
          <Text style={st.btnText}>확인</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(28),
    zIndex: 9999,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: s(20),
    paddingHorizontal: s(24),
    paddingTop: s(28),
    paddingBottom: s(20),
  },
  title: {
    fontSize: s(16),
    fontWeight: '800',
    color: '#0C1C3C',
    textAlign: 'center',
    lineHeight: s(24),
    marginBottom: s(20),
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF4FF',
    marginBottom: s(16),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
    marginBottom: s(16),
  },
  iconWrap: {
    width: s(42),
    height: s(42),
    borderRadius: s(12),
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textWrap: { flex: 1 },
  label: { fontSize: s(14), fontWeight: '700', color: '#0C1C3C', marginBottom: s(2) },
  desc:  { fontSize: s(12), color: '#AABBCC' },
  btn: {
    marginTop: s(8),
    backgroundColor: '#3B6FE8',
    borderRadius: s(12),
    paddingVertical: s(14),
    alignItems: 'center',
  },
  btnText: { fontSize: s(15), fontWeight: '800', color: '#fff' },
});
