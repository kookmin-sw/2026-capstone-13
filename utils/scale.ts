import { Dimensions, PixelRatio } from 'react-native';

const BASE_WIDTH = 390; // iPhone 14 기준
const MAX_SCALE  = 1.15; // 아이패드 등 큰 화면에서 폰과 비슷한 크기 유지

const { width } = Dimensions.get('window');
const scale = Math.min(width / BASE_WIDTH, MAX_SCALE);

export const s  = (size: number) => Math.round(PixelRatio.roundToNearestPixel(size * scale));
export const ms = s;
export const vs = s;
