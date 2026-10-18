// Named statuses and roles, taken from shared/constants.ts (never typed as string literals).
import { ORDER_STATUSES, ROLES } from '@shared/constants';

export const [SENT, PREPARING, READY, SERVED, PAID] = ORDER_STATUSES;
export const [WAITER, COOK] = ROLES;

/** Statuses the kitchen board shows (New, Preparing, Ready lanes). */
export const KITCHEN_STATUSES = [SENT, PREPARING, READY] as const;
