// 메인 탭 네비게이션 레이아웃
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          paddingBottom: 8,
          height: 68,
        },
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: Colors.textPrimary,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          tabBarLabel: '홈',
        }}
      />
      <Tabs.Screen
        name="school"
        options={{
          title: '학교생활',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '커뮤니티',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      {/* requests는 내부적으로 유지 (탭바 미노출) */}
      <Tabs.Screen
        name="requests"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '채팅',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '마이페이지',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      {/* 탭바에 표시하지 않는 글쓰기 화면 */}
      <Tabs.Screen
        name="write"
        options={{ href: null, headerShown: false }}
      />
    </Tabs>
  );
}
