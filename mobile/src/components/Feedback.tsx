// Banner, EmptyState and Skeleton: inline messages, empty/error blocks and loading shapes.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { strings } from '@/strings';
import { colors, lineHeight, radius, size, spacing, text } from '@/theme';
import { Button, type IconName } from './Button';

type BannerProps = {
  tone?: 'error' | 'info';
  title?: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function Banner({ tone = 'error', title, body, actionLabel, onAction }: BannerProps) {
  const isError = tone === 'error';
  return (
    <View
      accessibilityRole={isError ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: isError ? colors.dangerSoft : colors.surfaceMuted }]}
    >
      <Ionicons
        name={isError ? 'alert-circle' : 'information-circle-outline'}
        size={size.icon}
        color={isError ? colors.danger : colors.textMuted}
        style={styles.bannerIcon}
      />
      <View style={styles.bannerText}>
        {title ? <Text style={[text('sm', 'semibold'), { color: colors.danger }]}>{title}</Text> : null}
        <Text style={[text('sm'), { color: colors.text }]}>{body}</Text>
      </View>
      {actionLabel && onAction ? (
        <Button variant="ghost" label={actionLabel} onPress={onAction} fullWidth={false} />
      ) : null}
    </View>
  );
}

type EmptyStateProps = {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  error?: boolean;
};

export function EmptyState({ icon, title, body, actionLabel, onAction, error }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyCircle, error && { backgroundColor: colors.dangerSoft }]}>
        <Ionicons
          name={error ? 'cloud-offline-outline' : icon}
          size={size.iconXl}
          color={error ? colors.danger : colors.textMuted}
        />
      </View>
      <Text style={[text('xl', 'bold'), styles.emptyTitle]}>{title}</Text>
      {body ? <Text style={[text('md'), styles.emptyBody]}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          variant="secondary"
          label={actionLabel}
          onPress={onAction}
          fullWidth={false}
          style={styles.emptyButton}
        />
      ) : null}
    </View>
  );
}

/** Pulsing placeholder container. Children are plain `Bone`s shaped like the real content. */
export function Skeleton({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.55, duration: 500, useNativeDriver }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View accessible accessibilityLabel={strings.common.loading} style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
}

export function Bone({ style }: { style: StyleProp<ViewStyle> }) {
  return <View accessible={false} style={[styles.bone, style]} />;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    gap: spacing[3],
  },
  bannerIcon: { marginTop: (lineHeight.sm - size.icon) / 2 },
  bannerText: { flex: 1, alignSelf: 'center' },
  empty: { alignItems: 'center', paddingVertical: spacing[8], paddingHorizontal: spacing[4] },
  emptyCircle: {
    width: size.heroCircle,
    height: size.heroCircle,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: spacing[4], color: colors.text, textAlign: 'center' },
  emptyBody: {
    marginTop: spacing[2],
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: size.textBlock,
  },
  emptyButton: { marginTop: spacing[6], minWidth: spacing[16] * 3 },
  bone: { backgroundColor: colors.surfaceMuted },
});
