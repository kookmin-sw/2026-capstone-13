import { Dimensions } from 'react-native';

const BASE_WIDTH = 390; // iPhone 14 기준
const { width } = Dimensions.get('window');

export const s = (size: number) => Math.round((width / BASE_WIDTH) * size);
