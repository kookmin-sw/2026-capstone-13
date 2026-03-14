// 시작 페이지 - 로그인 화면으로 리다이렉트
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
