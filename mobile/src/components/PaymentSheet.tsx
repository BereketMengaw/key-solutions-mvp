// Bottom sheet for "Mark paid": pick Cash / Telebirr / CBE Birr. A label only, no money moves.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PAYMENT_METHODS, type PaymentMethod } from '@shared/constants';
import { strings } from '@/strings';
import { colors, radius, shadow, size, spacing, tabularNums, text } from '@/theme';
import { Button, type IconName } from './Button';
import { Banner } from './Feedback';

const p = strings.payment;

const methodIcons: Record<PaymentMethod, IconName> = {
  cash: 'cash-outline',
  telebirr: 'phone-portrait-outline',
  cbe_birr: 'business-outline',
};

type Props = {
  order: { id: number; tableNumber: number; total: string } | null;
  saving: boolean;
  failed: boolean;
  onConfirm: (method: PaymentMethod) => void;
  onClose: () => void;
};

export function PaymentSheet({ order, saving, failed, onConfirm, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [shownFor, setShownFor] = useState<number | null>(null);

  // A new order opens with nothing picked.
  if (order && order.id !== shownFor) {
    setShownFor(order.id);
    setMethod(null);
  }

  const close = () => {
    if (!saving) onClose();
  };

  return (
    <Modal visible={order !== null} transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={close} accessible={false} />
        {order ? (
          <View style={[styles.sheet, { paddingBottom: spacing[5] + insets.bottom }]}>
            <View style={styles.handle} />
            <Text accessibilityRole="header" style={[text('xl', 'bold'), { color: colors.text }]}>
              {p.title(order.tableNumber)}
            </Text>
            <Text style={[text('md'), tabularNums, { color: colors.textMuted }]}>{p.subtitle(order.id, order.total)}</Text>
            <Text style={[text('xs', 'semibold'), styles.question]}>{p.question}</Text>
            <View accessibilityRole="radiogroup" style={styles.options}>
              {PAYMENT_METHODS.map((m) => {
                const checked = method === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMethod(m)}
                    disabled={saving}
                    accessibilityRole="radio"
                    accessibilityLabel={strings.paymentMethods[m]}
                    accessibilityState={{ checked, disabled: saving }}
                    style={({ pressed }) => [styles.option, pressed && styles.optionPressed, checked && styles.optionOn]}
                  >
                    <View style={[styles.optionIcon, checked && { backgroundColor: colors.surface }]}>
                      <Ionicons name={methodIcons[m]} size={size.iconLg} color={colors.text} />
                    </View>
                    <Text style={[text('lg', 'semibold'), styles.flex, { color: colors.text }]}>
                      {strings.paymentMethods[m]}
                    </Text>
                    <Ionicons
                      name={checked ? 'radio-button-on' : 'radio-button-off'}
                      size={size.iconLg}
                      color={checked ? colors.primary : colors.textMuted}
                    />
                  </Pressable>
                );
              })}
            </View>
            <Text style={[text('sm'), styles.note]}>{p.note}</Text>
            {failed ? <Banner body={p.failed} style={styles.error} /> : null}
            <Button
              label={p.confirm}
              loadingLabel={p.saving}
              loading={saving}
              disabled={method === null}
              onPress={() => method && onConfirm(method)}
              style={styles.confirm}
            />
            <Button
              variant="ghost"
              label={strings.common.cancel}
              onPress={close}
              disabled={saving}
              fullWidth
              style={styles.cancel}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing[5],
    ...shadow('lg'),
  },
  handle: {
    alignSelf: 'center',
    width: spacing[10],
    height: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing[3],
  },
  question: { marginTop: spacing[5], color: colors.textMuted, letterSpacing: 1 },
  options: { marginTop: spacing[2], gap: spacing[3] },
  option: {
    minHeight: spacing[16],
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderControl,
  },
  optionPressed: { backgroundColor: colors.surfaceMuted },
  optionOn: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  optionIcon: {
    width: size.tileSm,
    height: size.tileSm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  note: { marginTop: spacing[3], color: colors.textSubtle },
  error: { marginTop: spacing[5] },
  confirm: { marginTop: spacing[5] },
  cancel: { marginTop: spacing[2] },
});
