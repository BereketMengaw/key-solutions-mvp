// Shared constants for mobile and web. Use these, never string literals.
// Values mirror the Postgres enums; the type checks below fail to compile
// if the database and this file drift apart after a migration.

import type { Database } from './database.types';

type DbEnums = Database['public']['Enums'];

export const ROLES = ['waiter', 'cook', 'manager', 'owner'] as const;
export type Role = (typeof ROLES)[number];

/** Roles that use the owner/manager website; the rest use the mobile app. */
export const WEB_ROLES = ['manager', 'owner'] as const satisfies readonly Role[];

/** In order: an order moves exactly one step forward. */
export const ORDER_STATUSES = ['sent', 'preparing', 'ready', 'served', 'paid'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Which next status each role may set (enforced by the database too). */
export const STATUS_CHANGES_BY_ROLE = {
  waiter: ['served', 'paid'],
  cook: ['preparing', 'ready'],
  manager: ['preparing', 'ready', 'served', 'paid'],
  owner: ['preparing', 'ready', 'served', 'paid'],
} as const satisfies Record<Role, readonly OrderStatus[]>;

/** The status after `status`, or null when the order is finished. */
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  return ORDER_STATUSES[ORDER_STATUSES.indexOf(status) + 1] ?? null;
}

export const STOCK_REASONS = ['order', 'restock', 'adjustment'] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

export const INGREDIENT_UNITS = ['kg', 'L', 'pcs'] as const;
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

// Compile-time drift checks against the generated enums.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const rolesMatchDb: Same<Role, DbEnums['app_role']> = true;
const statusesMatchDb: Same<OrderStatus, DbEnums['order_status']> = true;
const reasonsMatchDb: Same<StockReason, DbEnums['stock_reason']> = true;
void rolesMatchDb;
void statusesMatchDb;
void reasonsMatchDb;
