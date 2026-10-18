import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/components/Button';
import { strings } from '@/strings';
import { colors, radius, shadow, size, spacing, text, touch } from '@/theme';

function TabIcon({ focused, icon, activeIcon }: { focused: boolean; icon: IconName; activeIcon: IconName }) {
  return (
    <View style={[styles.pill, focused && styles.pillActive]}>
      <Ionicons
        name={focused ? activeIcon : icon}
        size={size.iconLg}
        color={focused ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

export default function WaiterTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: touch.minTarget + spacing[3] * 2 + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          ...shadow('none'),
        },
        tabBarItemStyle: { paddingVertical: spacing[2], gap: spacing[1] },
        tabBarLabelStyle: text('xs', 'semibold'),
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="tables"
        options={{
          title: strings.tabs.tables,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="grid-outline" activeIcon="grid" />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: strings.tabs.myOrders,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="receipt-outline" activeIcon="receipt" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: spacing[8],
    width: spacing[16],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.primarySoft },
});
