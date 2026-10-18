import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const locks = {
  portrait: ScreenOrientation.OrientationLock.PORTRAIT_UP,
  landscape: ScreenOrientation.OrientationLock.LANDSCAPE,
} as const;

/**
 * Locks the screen while the calling screen is mounted, unlocks on unmount.
 * Browsers only allow locking in fullscreen, so on web this does nothing.
 */
export function useOrientationLock(orientation: keyof typeof locks) {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    ScreenOrientation.lockAsync(locks[orientation]).catch(() => {});
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, [orientation]);
}
