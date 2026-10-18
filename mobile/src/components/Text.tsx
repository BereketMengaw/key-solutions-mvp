// React Native Text that switches to the Ethiopic font in Amharic. Use it instead of RN's Text.
import type { ComponentProps } from 'react';
import { Text as RNText } from 'react-native';

import { useLocalFont } from '@/lib/i18n';

export function Text({ style, ...rest }: ComponentProps<typeof RNText>) {
  const localFont = useLocalFont();
  return <RNText {...rest} style={localFont(style)} />;
}
