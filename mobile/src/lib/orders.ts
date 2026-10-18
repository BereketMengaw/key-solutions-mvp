import type { OrderStatus, PaymentMethod } from '@shared/constants';
import { supabase } from './supabase';

export type AdvanceResult =
  /** The update went through. */
  | { kind: 'ok' }
  /** Someone else moved the order first; `status` is where it is now. Not an error. */
  | { kind: 'moved'; status: OrderStatus }
  | { kind: 'failed' };

/**
 * Moves an order from `from` to `to` (the next status only; the database rejects anything else).
 * The update only matches while the order is still at `from`, so a stale tap can't skip a step.
 */
export async function advanceOrder(
  id: number,
  from: OrderStatus,
  to: OrderStatus,
  paymentMethod?: PaymentMethod,
): Promise<AdvanceResult> {
  const patch = paymentMethod ? { status: to, payment_method: paymentMethod } : { status: to };
  const { data, error } = await supabase.from('orders').update(patch).eq('id', id).eq('status', from).select('id');
  if (!error && data.length === 1) return { kind: 'ok' };

  // No row matched, or the database said no: check whether the order already moved on.
  const now = await supabase.from('orders').select('status').eq('id', id).maybeSingle();
  if (!now.error && now.data && now.data.status !== from) return { kind: 'moved', status: now.data.status };
  return { kind: 'failed' };
}
