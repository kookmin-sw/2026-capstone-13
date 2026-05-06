const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Expo Go 실행 시 EXPO_GO=1 환경변수로 agora 목업 사용
if (process.env.EXPO_GO === '1') {
  config.resolver.extraNodeModules = {
    'react-native-agora': path.resolve(__dirname, 'mocks/react-native-agora.ts'),
  };
}

module.exports = config;
