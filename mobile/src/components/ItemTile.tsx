import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { monogram } from '@/lib/format';
import { categoryTints, radius, size, text } from '@/theme';

/** Tint for a category by its position (sort_order), so renamed categories keep their color. */
export function tintFor(categorySortOrder: number) {
  const n = categoryTints.length;
  return categoryTints[(((categorySortOrder - 1) % n) + n) % n];
}

type Props = { name: string; categorySortOrder: number; variant: 'card' | 'small' };

/** The item's picture until photos exist: category tint, monogram and two "plate" rings. */
export function ItemTile({ name, categorySortOrder, variant }: Props) {
  const tint = tintFor(categorySortOrder);
  const h = variant === 'card' ? size.tileCard : size.tileSm;
  const ring = (ratio: number) => ({
    width: h * ratio,
    height: h * ratio,
    borderColor: tint.fg,
  });
  return (
    <View
      accessible={false}
      style={[variant === 'card' ? styles.card : styles.small, { backgroundColor: tint.bg }]}
    >
      <View style={[styles.ring, ring(0.72)]} />
      {variant === 'card' ? <View style={[styles.ring, ring(1.2)]} /> : null}
      <Text
        style={[
          variant === 'card' ? text('3xl', 'bold') : text('md', 'bold'),
          styles.monogram,
          { color: tint.fg },
        ]}
      >
        {monogram(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: size.tileCard,
    alignSelf: 'stretch',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    width: size.tileSm,
    height: size.tileSm,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { position: 'absolute', borderWidth: 1.5, borderRadius: radius.full, opacity: 0.12 },
  monogram: { letterSpacing: 0.5 },
});
