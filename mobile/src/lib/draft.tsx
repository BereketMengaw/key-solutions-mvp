// The order being built, held in memory until it is sent. One draft at a time.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Tables } from '@shared/database.types';

export const MAX_QUANTITY = 99;
export const NOTE_MAX_LENGTH = 120;

type MenuItem = Tables<'menu_items'>;

export type DraftLine = {
  menuItemId: MenuItem['id'];
  name: MenuItem['name'];
  priceEtb: MenuItem['price_etb'];
  categorySortOrder: Tables<'menu_categories'>['sort_order'];
  quantity: number;
  note: string;
};

export type DraftTable = { id: number; number: number; seats: number };

type Draft = { table: DraftTable | null; lines: DraftLine[] };

type DraftContextValue = Draft & {
  count: number;
  total: number;
  quantityOf: (menuItemId: number) => number;
  add: (table: DraftTable, line: Omit<DraftLine, 'quantity' | 'note'>) => void;
  increment: (menuItemId: number) => void;
  decrement: (menuItemId: number) => void;
  setNote: (menuItemId: number, note: string) => void;
  clear: () => void;
};

const DraftContext = createContext<DraftContextValue | null>(null);

const EMPTY: Draft = { table: null, lines: [] };

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(EMPTY);

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
  const clear = useCallback(() => setDraft(EMPTY), []);

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
    };
  }, [draft, add, increment, decrement, setNote, clear]);

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used inside DraftProvider');
  return ctx;
}
