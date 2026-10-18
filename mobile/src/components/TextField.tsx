import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useId, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { Text } from '@/components/Text';
import { useLocalFont, useT } from '@/lib/i18n';
import { colors, lineHeight, radius, size, spacing, text, touch } from '@/theme';
import { IconButton } from './IconButton';

type Props = Omit<TextInputProps, 'style' | 'editable'> & {
  label?: string;
  error?: string;
  disabled?: boolean;
  password?: boolean;
  /** Item-note variant: smaller text, grows up to 3 lines. */
  multilineNote?: boolean;
};

export const TextField = forwardRef<TextInputInstance, Props>(function TextField(
  { label, error, disabled, password, multilineNote, onFocus, onBlur, ...input },
  ref,
) {
  const strings = useT();
  const localFont = useLocalFont();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const labelId = useId();

  const borderColor = error ? colors.danger : focused ? colors.focusRing : disabled ? colors.border : colors.borderControl;
  const thick = Boolean(error) || focused;

  return (
    <View>
      {label ? (
        <Text nativeID={labelId} style={[text('sm', 'semibold'), styles.label]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.box,
          multilineNote && styles.noteBox,
          {
            borderColor,
            borderWidth: thick ? 2 : 1.5,
            // Keep the outer size fixed when the border thickens.
            paddingHorizontal: spacing[4] - (thick ? 0.5 : 0),
            backgroundColor: disabled ? colors.surfaceMuted : colors.surface,
          },
        ]}
      >
        <TextInput
          ref={ref}
          {...input}
          editable={!disabled}
          multiline={multilineNote}
          secureTextEntry={password ? hidden : input.secureTextEntry}
          accessibilityLabel={input.accessibilityLabel ?? label}
          aria-labelledby={label ? labelId : undefined}
          placeholderTextColor={colors.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={localFont([
            multilineNote ? text('sm') : text('md'),
            styles.input,
            multilineNote && styles.noteInput,
            { color: disabled ? colors.textMuted : colors.text },
          ])}
        />
        {password ? (
          <IconButton
            icon={hidden ? 'eye-outline' : 'eye-off-outline'}
            accessibilityLabel={hidden ? strings.login.showPassword : strings.login.hidePassword}
            onPress={() => setHidden((h) => !h)}
            color={colors.textMuted}
            disabled={disabled}
          />
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={size.iconSm} color={colors.danger} />
          <Text style={[text('sm'), styles.errorText]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { color: colors.text, marginBottom: spacing[2] },
  box: {
    minHeight: touch.minTarget + spacing[2],
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteBox: { minHeight: touch.minTarget },
  // The box draws the focus ring; drop the browser's own outline in the web build.
  input: { flex: 1, alignSelf: 'stretch', paddingVertical: spacing[2], outlineWidth: 0 },
  noteInput: { maxHeight: lineHeight.sm * 3 + spacing[2] * 2, textAlignVertical: 'top' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[2] },
  errorText: { color: colors.danger, flex: 1 },
});
