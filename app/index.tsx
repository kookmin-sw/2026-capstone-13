// 시작 페이지 - 스플래시 화면으로 진입
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/splash" />;
}
