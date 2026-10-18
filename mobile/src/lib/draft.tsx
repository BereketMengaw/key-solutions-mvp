// The order being built, held in memory until it is sent. One draft at a time.
import { randomUUID } from 'expo-crypto';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import type { Tables } from '@shared/database.types';

export const MAX_QUANTITY = 99;
export const NOTE_MAX_LENGTH = 120;

type MenuItem = Tables<'menu_items'>;

export type DraftLine = {
  menuItemId: MenuItem['id'];
  name: MenuItem['name'];
  nameAm: MenuItem['name_am'];
  priceEtb: MenuItem['price_etb'];
  categorySortOrder: Tables<'menu_categories'>['sort_order'];
  quantity: number;
  note: string;
};

export type DraftTable = { id: number; number: number; seats: number };

type Draft = { table: DraftTable | null; lines: DraftLine[] };

/** What `place_order` receives for one line. */
export type OrderItemPayload = { menu_item_id: number; quantity: number; note: string };

type DraftContextValue = Draft & {
  count: number;
  total: number;
  quantityOf: (menuItemId: number) => number;
  add: (table: DraftTable, line: Omit<DraftLine, 'quantity' | 'note'>) => void;
  increment: (menuItemId: number) => void;
  decrement: (menuItemId: number) => void;
  setNote: (menuItemId: number, note: string) => void;
  clear: () => void;
  /**
   * Idempotency key for sending this draft. The same order content gets the same key for as
   * long as the draft lives (it outlives the cart screen), so a retry after a timeout returns
   * the order the first call created instead of making a second one. Any change to what would
   * be sent, or clear(), gives the next Send a new key.
   */
  clientRefFor: (tableId: number, items: OrderItemPayload[]) => string;
};

const DraftContext = createContext<DraftContextValue | null>(null);

const EMPTY: Draft = { table: null, lines: [] };

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  // Not state: it never affects rendering. Keyed by the exact payload it was made for.
  const sendKey = useRef<{ payload: string; ref: string } | null>(null);

  const clientRefFor = useCallback<DraftContextValue['clientRefFor']>((tableId, items) => {
    const payload = JSON.stringify([tableId, items]);
    if (sendKey.current?.payload !== payload) sendKey.current = { payload, ref: randomUUID() };
    return sendKey.current.ref;
  }, []);

  const add = useCallback<DraftContextValue['add']>((table, line) => {
    setDraft((d) => {
      const base = d.table?.id === table.id ? d : { table, lines: [] };
      const existing = base.lines.find((l) => l.menuItemId === line.menuItemId);
      if (existing) {
        return {
          ...base,
          lines: base.lines.map((l) =>
            l.menuItemId === line.menuItemId
              ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + 1) }
              : l,
          ),
        };
      }
      return { ...base, lines: [...base.lines, { ...line, quantity: 1, note: '' }] };
    });
  }, []);

  const update = useCallback((menuItemId: number, fn: (l: DraftLine) => DraftLine | null) => {
    setDraft((d) => ({
      ...d,
      lines: d.lines.flatMap((l) => {
        if (l.menuItemId !== menuItemId) return [l];
        const next = fn(l);
        return next ? [next] : [];
      }),
    }));
  }, []);

  const increment = useCallback(
    (id: number) => update(id, (l) => ({ ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + 1) })),
    [update],
  );
  const decrement = useCallback(
    (id: number) => update(id, (l) => (l.quantity <= 1 ? null : { ...l, quantity: l.quantity - 1 })),
    [update],
  );
  const setNote = useCallback(
    (id: number, note: string) => update(id, (l) => ({ ...l, note: note.slice(0, NOTE_MAX_LENGTH) })),
    [update],
  );
  const clear = useCallback(() => {
    sendKey.current = null;
    setDraft(EMPTY);
  }, []);

  const value = useMemo<DraftContextValue>(() => {
    const count = draft.lines.reduce((s, l) => s + l.quantity, 0);
    const total = draft.lines.reduce((s, l) => s + l.quantity * l.priceEtb, 0);
    return {
      ...draft,
      count,
      total,
      quantityOf: (id) => draft.lines.find((l) => l.menuItemId === id)?.quantity ?? 0,
      add,
      increment,
      decrement,
      setNote,
      clear,
      clientRefFor,
    };
  }, [draft, add, increment, decrement, setNote, clear, clientRefFor]);

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used inside DraftProvider');
  return ctx;
}
