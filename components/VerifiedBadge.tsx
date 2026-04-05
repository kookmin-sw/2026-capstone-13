import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md';
}

export function VerifiedBadge({ size = 'sm' }: VerifiedBadgeProps) {
  const iconSize = size === 'md' ? 16 : 13;
  const fontSize = size === 'md' ? 12 : 11;

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
    gap: 2,
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  text: {
    color: '#16a34a',
    fontWeight: '700',
  },
});
