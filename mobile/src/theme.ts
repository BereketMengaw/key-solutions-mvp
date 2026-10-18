// Style helpers built only from design/tokens.ts.
import { Platform, type TextStyle } from 'react-native';
import {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
} from '@expo-google-fonts/noto-sans';
import {
  NotoSansEthiopic_400Regular,
  NotoSansEthiopic_500Medium,
  NotoSansEthiopic_600SemiBold,
  NotoSansEthiopic_700Bold,
} from '@expo-google-fonts/noto-sans-ethiopic';

import { fontSize, fontWeight, lineHeight, shadows } from '@design/tokens';

export * from '@design/tokens';

type Weight = keyof typeof fontWeight;
type Size = keyof typeof fontSize;

/** Noto Sans ships one file per weight; on Android fontWeight alone can't pick the file. */
export const fontFiles = {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
  NotoSansEthiopic_400Regular,
  NotoSansEthiopic_500Medium,
  NotoSansEthiopic_600SemiBold,
  NotoSansEthiopic_700Bold,
};

const familyByWeight: Record<Weight, keyof typeof fontFiles> = {
  regular: 'NotoSans_400Regular',
  medium: 'NotoSans_500Medium',
  semibold: 'NotoSans_600SemiBold',
  bold: 'NotoSans_700Bold',
};

/** Amharic mode swaps each Noto Sans file for the Noto Sans Ethiopic file of the same weight. */
export const ethiopicFamily: Record<string, keyof typeof fontFiles> = {
  NotoSans_400Regular: 'NotoSansEthiopic_400Regular',
  NotoSans_500Medium: 'NotoSansEthiopic_500Medium',
  NotoSans_600SemiBold: 'NotoSansEthiopic_600SemiBold',
  NotoSans_700Bold: 'NotoSansEthiopic_700Bold',
};

/** fontSize + matching lineHeight + the font file for the weight. */
export function text(size: Size, weight: Weight = 'regular'): TextStyle {
  return {
    fontSize: fontSize[size],
    lineHeight: lineHeight[size],
    fontFamily: familyByWeight[weight],
  };
}

/** Digits that don't jump as values change. */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

/** Token shadow for the current platform (native shadow props, CSS box-shadow on web). */
export function shadow(key: keyof typeof shadows) {
  const { css, ...native } = shadows[key];
  return Platform.OS === 'web' ? { boxShadow: css } : native;
}
