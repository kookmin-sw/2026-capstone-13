import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { s } from '../utils/scale';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md';
}

export function VerifiedBadge({ size = 'sm' }: VerifiedBadgeProps) {
  const iconSize = size === 'md' ? 16 : 13;
  const fontSize = size === 'md' ? s(12) : s(11);

  return (
    <View style={styles.badge}>
      <Ionicons name="shield-checkmark" size={iconSize} color="#22c55e" />
      <Text style={[styles.text, { fontSize }]}>인증</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(2),
    backgroundColor: '#f0fdf4',
    borderRadius: s(20),
    paddingHorizontal: s(6),
    paddingVertical: s(2),
    borderWidth: s(1),
    borderColor: '#86efac',
  },
  text: {
    color: '#16a34a',
    fontWeight: '700',
  },
});
