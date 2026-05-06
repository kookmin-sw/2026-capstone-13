import { Dimensions, PixelRatio } from 'react-native';

const BASE_WIDTH = 390; // iPhone 14 기준

const { width } = Dimensions.get('window');

// 아이패드(768px+)는 1.5배로 제한, 폰은 그대로
const MAX_SCALE = width >= 768 ? 1.5 : 999;
const scale = Math.min(width / BASE_WIDTH, MAX_SCALE);

export const s  = (size: number) => Math.round(PixelRatio.roundToNearestPixel(size * scale));
export const ms = s;
export const vs = s;
