import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../stores/authStore';

const ACTIVE_BG = '#3B6FE8';
const INACTIVE_COLOR = '#999999';
const PILL_WIDTH = 76;
const PILL_HEIGHT = 52;

type TabConfig = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const TAB_CONFIG: TabConfig[] = [
  { name: 'home',      label: '홈',      icon: 'home-outline',        activeIcon: 'home'        },
  { name: 'school',    label: '학교',    icon: 'school-outline',      activeIcon: 'school'      },
  { name: 'community', label: '커뮤니티', icon: 'people-outline',      activeIcon: 'people'      },
  { name: 'chat',      label: '채팅',    icon: 'chatbubbles-outline',  activeIcon: 'chatbubbles' },
  { name: 'profile',   label: '프로필',  icon: 'person-outline',       activeIcon: 'person'      },
];

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { user } = useAuthStore();
  const isKorean = user?.userType === 'KOREAN';

  const visibleRoutes = state.routes.filter((route) => {
    if (descriptors[route.key].options.href === null) return false;
    if (isKorean && route.name === 'school') return false;
    return true;
  });

  const focusedVisibleIndex = visibleRoutes.findIndex(
    (r) => r.key === state.routes[state.index]?.key,
  );

  const tabLayouts = useRef<Record<number, { x: number; width: number }>>({});
  const pillX = useRef(new Animated.Value(0)).current;
  const focusedIndexRef = useRef(focusedVisibleIndex);
  focusedIndexRef.current = focusedVisibleIndex;

  // 탭 수가 바뀌면 레이아웃 리셋
  const prevTabCount = useRef(visibleRoutes.length);
  if (prevTabCount.current !== visibleRoutes.length) {
    prevTabCount.current = visibleRoutes.length;
    tabLayouts.current = {};
  }

  const movePill = (index: number, animated: boolean) => {
    const layout = tabLayouts.current[index];
    if (!layout) return;
    const toX = layout.x + (layout.width - PILL_WIDTH) / 2;
    if (animated) {
      Animated.spring(pillX, {
        toValue: toX,
        useNativeDriver: true,
        friction: 7,
        tension: 55,
      }).start();
    } else {
      pillX.setValue(toX);
    }
  };

  useEffect(() => {
    movePill(focusedVisibleIndex, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedVisibleIndex]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.activePill, { transform: [{ translateX: pillX }] }]}
        pointerEvents="none"
      />

      {visibleRoutes.map((route, i) => {
        const tabCfg = TAB_CONFIG.find((t) => t.name === route.name);
        if (!tabCfg) return null;

        const isFocused = i === focusedVisibleIndex;
        const options = descriptors[route.key].options;
        const badge = (options as { tabBarBadge?: number }).tabBarBadge;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={`${route.key}-${visibleRoutes.length}`}
            style={styles.tab}
            onPress={onPress}
            activeOpacity={0.8}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              tabLayouts.current[i] = { x, width };
              const filledCount = Object.keys(tabLayouts.current).length;
              if (filledCount === visibleRoutes.length) {
                movePill(focusedIndexRef.current, false);
              }
            }}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={isFocused ? tabCfg.activeIcon : tabCfg.icon}
                size={24}
                color={isFocused ? '#fff' : INACTIVE_COLOR}
              />
              {badge != null && badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {tabCfg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 40,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  activePill: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: 26,
    backgroundColor: ACTIVE_BG,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    zIndex: 1,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: INACTIVE_COLOR,
  },
  labelActive: {
    color: '#fff',
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
});
