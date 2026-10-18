'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Drawer } from '@/components/Drawer';
import { Icon } from '@/components/icons';
import { Banner, Button, FieldError, cx, fieldBox } from '@/components/ui';
import { formatQuantity, isLow, unitWord } from '@/lib/format';
import type { Ingredient } from '@/lib/stock/StockProvider';
import { s } from '@/lib/strings';
import { getSupabase } from '@/lib/supabase/client';

const NOTE_MAX = 120;
const NOTE_COUNTER_FROM = 100;
const TIMEOUT_MS = 15_000;
/** Stricter than the backend (10,000 for everything): a kitchen never gets a tonne of beef. */
const LIMIT = { kg: 1_000, L: 1_000, pcs: 10_000 } as const;

/**
 * Maps an add_stock 22023 (bad input) to the field it belongs to, by the backend's message.
 * Anything unrecognised returns null and the caller shows the server message.
 */
function fieldErrorFor(message: string, ing: Ingredient): Errors | null {
  const m = message.toLowerCase();
  if (m.includes('ingredient')) return { ingredient: s.drawer.errUnknownIngredient };
  if (m.includes('note')) return { note: s.drawer.errNoteLong };
  if (m.includes('amount')) {
    if (m.includes('more than 0')) return { amount: s.drawer.errPositive };
    if (m.includes('decimal')) return { amount: s.drawer.errDecimals };
    const max = /at most ([\d,.]+)/.exec(m);
    if (max) return { amount: s.drawer.errTooMuch(formatQuantity(Number(max[1].replace(/,/g, '')), ing.unit)) };
    return { amount: message };
  }
  return null;
}

type Parsed = { ok: true; value: number } | { ok: false; error: string };

/** "2,5" → 2.5; spaces trimmed. Validation per 04-stock.md → Add stock → Validation. */
export function parseAmount(raw: string, ing: Ingredient | undefined): Parsed {
  const text = raw.trim().replace(',', '.');
  if (!text) return { ok: false, error: s.drawer.errEmpty };
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(text)) return { ok: false, error: s.drawer.errNumber };
  const value = Number(text);
  if (!Number.isFinite(value)) return { ok: false, error: s.drawer.errNumber };
  if (value <= 0) return { ok: false, error: s.drawer.errPositive };
  if (!ing) return { ok: true, value };
  const pieces = ing.unit === 'pcs';
  if (pieces && !Number.isInteger(value)) return { ok: false, error: s.drawer.errWhole(ing.name) };
  const decimals = text.includes('.') ? text.split('.')[1].length : 0;
  if (!pieces && decimals > 3) return { ok: false, error: s.drawer.errDecimals };
  const limit = LIMIT[ing.unit as keyof typeof LIMIT] ?? LIMIT.kg;
  if (value > limit) return { ok: false, error: s.drawer.errTooMuch(formatQuantity(limit, ing.unit)) };
  return { ok: true, value };
}

type Errors = { ingredient?: string; amount?: string; note?: string };
type FormBanner = { title: string; body: string } | null;

export type AddStockResult = { ingredient: Ingredient; added: number; newQuantity: number };

export function AddStockDrawer({
  open,
  onClose,
  ingredients,
  initialId,
  onAdded,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  initialId: number | null;
  onAdded: (r: AddStockResult) => void;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}) {
  // The parent remounts this form (key) every time the drawer opens, so it always starts fresh.
  const [id, setId] = useState<number | null>(initialId);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<FormBanner>(null);
  const [busy, setBusy] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  /**
   * Idempotency key for add_stock. Kept across retries of the same ingredient + amount + note
   * (so a retry after a lost response never adds twice); a new one when any of those change.
   * The form remounts on every open, so reopening always starts with a fresh key.
   */
  const clientRef = useRef<{ key: string; ref: string } | null>(null);

  const ing = ingredients.find((i) => i.id === id);
  const parsed = parseAmount(amount, ing);
  const after = ing && parsed.ok ? ing.quantity_on_hand + parsed.value : null;

  const touch = () => setBanner(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const found: Errors = {};
    if (!ing) found.ingredient = s.drawer.errChoose;
    const p = parseAmount(amount, ing);
    if (!p.ok) found.amount = p.error;
    setErrors(found);
    if (found.ingredient) return selectRef.current?.focus();
    if (found.amount || !ing || !p.ok) return amountRef.current?.focus();

    setBusy(true);
    setBanner(null);
    const trimmed = note.trim();
    const key = JSON.stringify([ing.id, p.value, trimmed]);
    if (clientRef.current?.key !== key) clientRef.current = { key, ref: crypto.randomUUID() };
    try {
      const { data, error } = await Promise.race([
        getSupabase().rpc('add_stock', {
          p_ingredient_id: ing.id,
          p_quantity: p.value,
          p_note: trimmed || undefined,
          p_client_ref: clientRef.current.ref,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
      ]);
      setBusy(false);
      if (error) {
        let fieldErrors: Errors | null;
        if (error.code === '42501') {
          setBanner({ title: s.drawer.notAllowedTitle, body: s.drawer.notAllowedBody });
        } else if (error.code === '22023' && /reference is already used/i.test(error.message)) {
          // The key belongs to a different delivery: drop it so the next tap starts fresh.
          clientRef.current = null;
          setBanner({ title: s.drawer.refUsedTitle, body: s.drawer.refUsedBody });
          submitRef.current?.focus();
        } else if (error.code === '22023' && (fieldErrors = fieldErrorFor(error.message, ing))) {
          setErrors(fieldErrors);
          (fieldErrors.ingredient ? selectRef : fieldErrors.note ? noteRef : amountRef).current?.focus();
        } else if (error.code === '22023' || error.code === '23514') {
          setBanner({ title: s.drawer.failedTitle, body: error.message || s.drawer.failedBody });
        } else if (!error.code) {
          setBanner({ title: s.drawer.networkTitle, body: s.drawer.networkBody });
          submitRef.current?.focus();
        } else {
          setBanner({ title: s.drawer.failedTitle, body: s.drawer.failedBody });
        }
        return;
      }
      onAdded({ ingredient: ing, added: p.value, newQuantity: Number(data) });
    } catch {
      setBusy(false);
      setBanner({ title: s.drawer.networkTitle, body: s.drawer.networkBody });
      submitRef.current?.focus();
    }
  }

  const amountErrId = 'amount-error';
  const amountHelpId = 'amount-help';
  const ingErrId = 'ingredient-error';
  const noteErrId = 'note-error';

  const footer = (
    <div className="px-6 py-4 border-t border-border bg-surface flex gap-3 justify-end">
      <Button variant="secondary" onClick={onClose} disabled={busy} className="flex-1 md:flex-none">
        {s.drawer.cancel}
      </Button>
      <Button
        ref={submitRef}
        type="submit"
        form="add-stock-form"
        loading={busy}
        loadingLabel={s.drawer.submitting}
        className="flex-1 md:flex-none"
      >
        {ing && parsed.ok ? s.drawer.submitQty(formatQuantity(parsed.value, ing.unit)) : s.drawer.submit}
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      busy={busy}
      title={s.drawer.title}
      subtitle={s.drawer.subtitle}
      footer={footer}
      initialFocusRef={initialId != null ? amountRef : selectRef}
      returnFocusRef={returnFocusRef}
    >
      <form id="add-stock-form" noValidate onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
        {banner && <Banner tone="error" title={banner.title} body={banner.body} />}

        <div>
          <label htmlFor="ingredient" className="block text-sm font-semibold text-text mb-2">
            {s.drawer.ingredient}
          </label>
          <div className="relative">
            <select
              ref={selectRef}
              id="ingredient"
              value={id ?? ''}
              disabled={busy}
              onChange={(e) => {
                const nextId = Number(e.target.value);
                setId(nextId);
                touch();
                setErrors((prev) => {
                  const nextIng = ingredients.find((i) => i.id === nextId);
                  const p = parseAmount(amount, nextIng);
                  return { ingredient: undefined, amount: prev.amount ? (p.ok ? undefined : p.error) : undefined };
                });
              }}
              aria-invalid={errors.ingredient ? true : undefined}
              aria-describedby={errors.ingredient ? ingErrId : undefined}
              className={fieldBox(!!errors.ingredient, 'appearance-none pr-12')}
            >
              {id == null && (
                <option value="" disabled>
                  {s.drawer.choose}
                </option>
              )}
              {ingredients.map((i) => (
                <option key={i.id} value={i.id}>
                  {s.drawer.option(i.name, formatQuantity(i.quantity_on_hand, i.unit), isLow(i.quantity_on_hand, i.low_stock_threshold))}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" className="size-icon text-text-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {errors.ingredient && <FieldError id={ingErrId} message={errors.ingredient} />}
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-semibold text-text mb-2">
            {s.drawer.amount}
          </label>
          <div className="relative">
            <input
              ref={amountRef}
              id="amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amount}
              disabled={busy}
              onChange={(e) => {
                setAmount(e.target.value);
                touch();
                if (errors.amount) setErrors((x) => ({ ...x, amount: undefined }));
              }}
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? amountErrId : amountHelpId}
              className={fieldBox(!!errors.amount, 'pr-16 tabular-nums')}
            />
            {ing && (
              <span aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-md font-semibold text-text-muted pointer-events-none">
                {ing.unit}
              </span>
            )}
          </div>
          {errors.amount ? (
            <FieldError id={amountErrId} message={errors.amount} />
          ) : (
            <p id={amountHelpId} className="mt-2 text-sm text-text-muted">
              {ing ? s.drawer.helper(unitWord(ing.unit)) : s.drawer.chooseFirst}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="note" className="block text-sm font-semibold text-text mb-2">
            {s.drawer.note}
          </label>
          <input
            ref={noteRef}
            id="note"
            type="text"
            maxLength={NOTE_MAX}
            placeholder={s.drawer.notePlaceholder}
            value={note}
            disabled={busy}
            onChange={(e) => {
              setNote(e.target.value);
              touch();
              if (errors.note) setErrors((x) => ({ ...x, note: undefined }));
            }}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={errors.note ? noteErrId : undefined}
            className={fieldBox(!!errors.note)}
          />
          {errors.note && <FieldError id={noteErrId} message={errors.note} />}
          {note.length >= NOTE_COUNTER_FROM && (
            <p className="mt-1 text-xs text-text-subtle text-right tabular-nums">{s.drawer.counter(note.length)}</p>
          )}
        </div>

        {ing && (
          <div aria-live="polite" className="rounded-lg bg-surface-muted p-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div>
                <p className="text-xs font-semibold text-text-muted">{s.drawer.onHandNow}</p>
                <p
                  className={cx(
                    'text-xl font-bold tabular-nums',
                    isLow(ing.quantity_on_hand, ing.low_stock_threshold) ? 'text-danger' : 'text-text',
                  )}
                >
                  {formatQuantity(ing.quantity_on_hand, ing.unit)}
                </p>
              </div>
              <span aria-hidden="true" className="text-xl text-text-subtle">
                →
              </span>
              <div>
                <p className="text-xs font-semibold text-text-muted">{s.drawer.after}</p>
                <p className="text-xl font-bold tabular-nums text-text">
                  {after == null ? s.stock.tiles.dash : formatQuantity(after, ing.unit)}
                </p>
              </div>
            </div>
            <PreviewLine ing={ing} after={after} />
          </div>
        )}
      </form>
    </Drawer>
  );
}

function PreviewLine({ ing, after }: { ing: Ingredient; after: number | null }) {
  const threshold = formatQuantity(ing.low_stock_threshold, ing.unit);
  const wasLow = isLow(ing.quantity_on_hand, ing.low_stock_threshold);
  if (after != null && wasLow && !isLow(after, ing.low_stock_threshold)) {
    return (
      <p className="mt-3 flex gap-2 text-sm font-semibold text-success">
        <Icon name="checkmark-circle" className="size-icon-sm mt-[3px]" />
        {s.drawer.backAbove(threshold)}
      </p>
    );
  }
  if (after != null && isLow(after, ing.low_stock_threshold)) {
    return (
      <p className="mt-3 flex gap-2 text-sm text-status-low-stock-fg">
        <Icon name="warning-outline" className="size-icon-sm mt-[3px]" />
        {s.drawer.stillLow(threshold)}
      </p>
    );
  }
  return <p className="mt-3 text-sm text-text-muted">{s.drawer.lowLevel(threshold)}</p>;
}
