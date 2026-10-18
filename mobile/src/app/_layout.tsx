import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth';
import { DraftProvider } from '@/lib/draft';
import { colors, fontFiles } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (e.g. fast refresh): nothing to do.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    // The startup screen renders on the same frame, so there is no white flash.
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DraftProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="wrong-role" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="(waiter)" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="kitchen" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="table/[tableId]/menu" />
            <Stack.Screen name="table/[tableId]/cart" />
          </Stack>
        </DraftProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
