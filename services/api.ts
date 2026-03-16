// Axios 인스턴스 + 인터셉터 설정
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// 백엔드 서버 URL - .env 파일의 EXPO_PUBLIC_API_URL로 설정
// 로컬: http://localhost:8080/api (iOS 시뮬레이터)
//       http://10.0.2.2:8080/api  (Android 에뮬레이터)
//       http://[내 IP]:8080/api   (실기기)
// 배포: Railway에서 발급된 URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-0a6f.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 매 요청마다 JWT 토큰 자동 첨부
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 401 에러 시 로그아웃 처리
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 → 저장된 토큰 삭제
      await SecureStore.deleteItemAsync('accessToken');
      // TODO: 로그인 화면으로 이동
    }
    return Promise.reject(error);
  }
);

export default api;
