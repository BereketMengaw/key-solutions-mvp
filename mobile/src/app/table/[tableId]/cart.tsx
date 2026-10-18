import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Banner, EmptyState } from '@/components/Feedback';
import { ItemTile } from '@/components/ItemTile';
import { QuantityStepper } from '@/components/QuantityStepper';
import { StatusBadge } from '@/components/StatusBadge';
import { TextField } from '@/components/TextField';
import { TopBarStack } from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { NOTE_MAX_LENGTH, useDraft, type DraftLine } from '@/lib/draft';
import { formatEtb } from '@/lib/format';
import { SENT } from '@/lib/names';
import { supabase } from '@/lib/supabase';
import { strings } from '@/strings';
import { colors, radius, shadow, size, spacing, tabularNums, text, touch } from '@/theme';

const s = strings.cart;
const NOTE_COUNT_FROM = 100;

type SendError = { kind: 'network' } | { kind: 'session' } | { kind: 'other'; message: string };
type SentOrder = { id: number; tableNumber: number; lines: DraftLine[]; total: number };

/** Session/permission problems sign the waiter out; network trouble retries; anything else shows the server's message. */
function classify(status: number, code: string, message: string): SendError {
  if (status === 0 || status >= 500) return { kind: 'network' };
  if (status === 401 || code === '42501' || code === 'PGRST301' || code === 'PGRST303') return { kind: 'session' };
  return { kind: 'other', message: message || s.otherBody };
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tableId: string; number?: string; seats?: string }>();
  const tableId = Number(params.tableId);
  const draft = useDraft();
  const { signOut } = useAuth();

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<SendError | null>(null);
  const [sent, setSent] = useState<SentOrder | null>(null);
  const [leaveTo, setLeaveTo] = useState<'/tables' | '/orders' | null>(null);
  const [openNotes, setOpenNotes] = useState<Set<number>>(new Set());
  const [focusNote, setFocusNote] = useState<number | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  // Idempotency key: made on the first Send tap, reused on every retry of the same order,
  // so a retry after a timeout returns the order the first call created instead of a second one.
  const clientRef = useRef<string | null>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Leave only after the "prevent remove" guard has been switched off by a render.
  useEffect(() => {
    if (!leaveTo) return;
    router.dismissAll();
    if (leaveTo === '/orders') router.navigate('/orders');
  }, [leaveTo]);

  // While sending: back is ignored. After sending: back means "Back to tables".
  usePreventRemove(sending || (sent !== null && leaveTo === null), () => {
    if (sent) setLeaveTo('/tables');
  });

  const lines = draft.table?.id === tableId ? draft.lines : [];
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const total = lines.reduce((n, l) => n + l.quantity * l.priceEtb, 0);
  const tableNumber = draft.table?.number ?? Number(params.number ?? tableId);

  const edit = (fn: () => void) => {
    setSendError(null);
    // The order changed, so it is a different order: the next Send gets a new key.
    clientRef.current = null;
    fn();
  };

  const send = async () => {
    if (sending) return;
    Keyboard.dismiss();
    setSendError(null);
    setSending(true);
    const items = lines.map((l) => ({ menu_item_id: l.menuItemId, quantity: l.quantity, note: l.note.trim() }));
    clientRef.current ??= randomUUID();
    const { data, error, status } = await supabase.rpc('place_order', {
      p_table_id: tableId,
      p_items: items,
      p_client_ref: clientRef.current,
    });
    setSending(false);
    if (error || data === null) {
      setSendError(classify(status, error?.code ?? '', error?.message ?? ''));
      return;
    }
    clientRef.current = null;
    setSent({ id: data, tableNumber, lines: lines.map((l) => ({ ...l, note: l.note.trim() })), total });
    draft.clear();
  };

  const signInAgain = async () => {
    draft.clear();
    await signOut();
    router.dismissAll();
    router.replace('/login');
  };

  if (sent) {
    return <SentView order={sent} onTables={() => setLeaveTo('/tables')} onOrders={() => setLeaveTo('/orders')} />;
  }

  const banner = sendError ? (
    sendError.kind === 'network' ? (
      <Banner title={s.sendFailedTitle} body={s.networkBody} />
    ) : sendError.kind === 'session' ? (
      <Banner title={s.signedOutTitle} body={s.signedOutBody} actionLabel={s.signIn} onAction={signInAgain} />
    ) : (
      <Banner title={s.sendFailedTitle} body={sendError.message} />
    )
  ) : null;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBarStack
        title={s.title}
        subtitle={s.subtitle(tableNumber, strings.common.itemCount(count))}
        onBack={() => router.back()}
        backDisabled={sending}
        right={
          <Button
            variant="ghost"
            icon="add"
            label={s.addMore}
            onPress={() => router.back()}
            disabled={sending}
            fullWidth={false}
          />
        }
      />

      {lines.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title={s.emptyTitle}
          body={s.emptyBody}
          actionLabel={s.backToMenu}
          onAction={() => router.back()}
        />
      ) : (
        <>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.scroll, { paddingBottom: panelHeight + spacing[4] }]}
          >
            <View style={[styles.card, sending && styles.dimmed]}>
              {lines.map((line, i) => {
                const noteOpen = openNotes.has(line.menuItemId) || line.note.length > 0;
                return (
                  <View key={line.menuItemId}>
                    {i > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.line}>
                      <View style={styles.rowA}>
                        <ItemTile name={line.name} categorySortOrder={line.categorySortOrder} variant="small" />
                        <View style={styles.flex}>
                          <Text style={[text('md', 'semibold'), { color: colors.text }]}>{line.name}</Text>
                          <Text style={[text('sm'), tabularNums, { color: colors.textMuted }]}>
                            {s.each(formatEtb(line.priceEtb))}
                          </Text>
                        </View>
                        <Text style={[text('md', 'bold'), tabularNums, { color: colors.text }]}>
                          {formatEtb(line.quantity * line.priceEtb)}
                        </Text>
                      </View>
                      <View style={[styles.rowB, styles.indent]}>
                        {noteOpen ? (
                          <View />
                        ) : (
                          <Button
                            variant="ghost"
                            icon="create-outline"
                            label={s.addNote}
                            disabled={sending}
                            onPress={() => {
                              setOpenNotes((prev) => new Set(prev).add(line.menuItemId));
                              setFocusNote(line.menuItemId);
                            }}
                            fullWidth={false}
                            style={styles.addNote}
                          />
                        )}
                        <QuantityStepper
                          item={line.name}
                          quantity={line.quantity}
                          disabled={sending}
                          onIncrement={() => edit(() => draft.increment(line.menuItemId))}
                          onDecrement={() => edit(() => draft.decrement(line.menuItemId))}
                        />
                      </View>
                      {noteOpen ? (
                        <View style={[styles.note, styles.indent]}>
                          <TextField
                            multilineNote
                            accessibilityLabel={s.noteFor(line.name)}
                            placeholder={s.notePlaceholder}
                            value={line.note}
                            maxLength={NOTE_MAX_LENGTH}
                            returnKeyType="done"
                            submitBehavior="blurAndSubmit"
                            autoFocus={focusNote === line.menuItemId}
                            disabled={sending}
                            onChangeText={(v) => edit(() => draft.setNote(line.menuItemId, v))}
                            onBlur={() => {
                              if (!line.note.trim()) {
                                draft.setNote(line.menuItemId, '');
                                setOpenNotes((prev) => {
                                  const next = new Set(prev);
                                  next.delete(line.menuItemId);
                                  return next;
                                });
                              }
                              setFocusNote(null);
                            }}
                          />
                          {line.note.length >= NOTE_COUNT_FROM ? (
                            <Text style={[text('xs'), tabularNums, styles.noteCount]}>
                              {s.noteCount(line.note.length)}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.summary}>
              <Text style={[text('md'), { color: colors.textMuted }]}>{s.items}</Text>
              <Text style={[text('md'), tabularNums, { color: colors.text }]}>{count}</Text>
            </View>
          </ScrollView>

          <View
            onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
            style={[styles.panel, { paddingBottom: insets.bottom + spacing[4] }]}
          >
            {banner ? <View style={styles.bannerSlot}>{banner}</View> : null}
            {keyboardOpen ? null : (
              <>
                <View style={styles.totalRow}>
                  <Text style={[text('lg', 'semibold'), { color: colors.text }]}>{strings.common.total}</Text>
                  <Text style={[text('2xl', 'bold'), tabularNums, { color: colors.text }]}>{formatEtb(total)}</Text>
                </View>
                <Button
                  icon={sendError?.kind === 'network' ? 'refresh' : 'paper-plane'}
                  label={sendError?.kind === 'network' ? strings.common.tryAgain : s.send}
                  loadingLabel={s.sending}
                  loading={sending}
                  onPress={send}
                  style={styles.send}
                />
              </>
            )}
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function SentView({ order, onTables, onOrders }: { order: SentOrder; onTables: () => void; onOrders: () => void }) {
  const insets = useSafeAreaInsets();
  const [enter] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [enter]);

  return (
    <View style={[styles.sent, { paddingTop: insets.top + spacing[6], paddingBottom: insets.bottom + spacing[4] }]}>
      <View style={styles.sentCenter}>
        <Animated.View
          style={[
            styles.successCircle,
            { opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
          ]}
        >
          <Ionicons name="checkmark" size={size.iconXl} color={colors.success} />
        </Animated.View>
        <Text accessibilityRole="header" style={[text('2xl', 'bold'), styles.sentTitle]}>
          {s.sentTitle}
        </Text>
        <Text style={[text('md'), tabularNums, styles.sentSubtitle]}>{s.sentSubtitle(order.tableNumber, order.id)}</Text>

        <View style={styles.receipt}>
          <View style={styles.receiptLines}>
            {order.lines.map((l) => (
              <View key={l.menuItemId} style={styles.receiptRow}>
                <Text style={[text('sm'), styles.flex, { color: colors.text }]}>
                  {strings.common.qtyLine(l.quantity, l.name)}
                </Text>
                <Text style={[text('sm'), tabularNums, { color: colors.text }]}>{formatEtb(l.quantity * l.priceEtb)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.receiptDivider} />
          <View style={styles.receiptRow}>
            <Text style={[text('md', 'semibold'), { color: colors.text }]}>{strings.common.total}</Text>
            <Text style={[text('md', 'bold'), tabularNums, { color: colors.text }]}>{formatEtb(order.total)}</Text>
          </View>
        </View>

        <View style={styles.sentStatus}>
          <StatusBadge status={SENT} />
          <Text style={[text('sm'), { color: colors.textMuted }]}>{s.cookCanSee}</Text>
        </View>
      </View>

      <Button label={s.backToTables} onPress={onTables} />
      <Button variant="secondary" label={s.viewMyOrders} onPress={onOrders} fullWidth style={styles.secondAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[4] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow('sm'),
  },
  dimmed: { opacity: 0.6 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing[4] },
  line: { padding: spacing[4] },
  rowA: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  indent: { marginLeft: size.tileSm + spacing[3] },
  rowB: { marginTop: spacing[3], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addNote: { paddingHorizontal: spacing[2], marginLeft: -spacing[2] },
  note: { marginTop: spacing[3] },
  noteCount: { color: colors.textSubtle, textAlign: 'right', marginTop: spacing[1] },
  summary: {
    marginTop: spacing[4],
    paddingHorizontal: spacing[1],
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    ...shadow('lg'),
  },
  bannerSlot: { marginBottom: spacing[3] },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  send: { marginTop: spacing[4], minHeight: touch.primaryAction },
  sent: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing[4] },
  sentCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  successCircle: {
    width: size.heroCircle,
    height: size.heroCircle,
    borderRadius: radius.full,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentTitle: { marginTop: spacing[5], color: colors.text, textAlign: 'center' },
  sentSubtitle: { marginTop: spacing[2], color: colors.textMuted },
  receipt: {
    marginTop: spacing[5],
    alignSelf: 'stretch',
    maxWidth: size.textBlock,
    width: '100%',
    marginHorizontal: 'auto',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
  },
  receiptLines: { gap: spacing[1] },
  receiptDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing[3] },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] },
  sentStatus: { marginTop: spacing[4], flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  secondAction: { marginTop: spacing[3] },
});
