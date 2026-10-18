// Shape of `rpc('dashboard_today')` (generated types only say `Json`).
// Keep in step with supabase/migrations/*_dashboard.sql and supabase/README.md.
//
//   const { data, error } = await supabase.rpc('dashboard_today');
//   const today = data as unknown as DashboardToday;

import type { OrderStatus, PaymentMethod, IngredientUnit } from './constants';

/** Order statuses that can appear on the live floor (everything but paid). */
export type OpenOrderStatus = Exclude<OrderStatus, 'paid'>;

export interface DashboardToday {
  /** Today's date in Addis, "YYYY-MM-DD". */
  date: string;
  /** Always "Africa/Addis_Ababa". */
  timezone: string;
  /** ISO timestamp (UTC) of when the numbers were computed. */
  generated_at: string;

  /** Sum of paid orders whose paid_at is today. 0 when none. */
  sales_etb: number;
  /** Orders paid today. */
  paid_orders: number;
  /** Orders sent today, any status. */
  orders_today: number;
  /** sales_etb / paid_orders, 2 decimals; 0 when no paid orders. */
  average_order_etb: number;
  /** Orders not paid yet, from any day (same rows as live_floor). */
  open_orders: number;

  /** Always 24 entries, hour 0..23 in Addis time, by paid_at. */
  sales_by_hour: { hour: number; sales_etb: number }[];
  /** Up to 5 items from orders sent today (any status), by quantity, then revenue, then name. */
  top_items: { menu_item_id: number; name: string; quantity: number; revenue_etb: number }[];
  /** Always 3 entries in PAYMENT_METHODS order (cash, telebirr, cbe_birr); zeros when unused. */
  payment_mix: { method: PaymentMethod; sales_etb: number; orders: number }[];
  /** Open orders, oldest first. */
  live_floor: {
    id: number;
    table_number: number;
    status: OpenOrderStatus;
    /** When the order was sent. */
    created_at: string;
    /** When it entered its current status (= created_at while sent). */
    status_at: string;
    /** Sum of line quantities. */
    item_count: number;
    waiter_name: string;
    total_etb: number;
  }[];
  /** Ingredients with quantity_on_hand < low_stock_threshold, most urgent (lowest ratio) first. */
  low_stock: {
    id: number;
    name: string;
    unit: IngredientUnit;
    quantity_on_hand: number;
    low_stock_threshold: number;
  }[];
}
