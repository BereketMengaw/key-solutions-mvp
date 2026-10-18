# Slice 1 — Backend, menu and logins

**Status:** awaiting Bereket's approval
**Agents:** `ui-designer` (tokens only), `backend`

## Goal

The database exists with the full demo data, and one login per role works. Nothing visible
to the client yet — this is the foundation every other slice builds on.

## Backend builds

- All tables from the starting data model in `.claude/agents/backend.md`, with RLS.
- `profiles` row created automatically when an auth user is created.
- Seed data:
  - 8 tables (Table 1–8)
  - 4 categories: Breakfast, Main dishes, Hot drinks, Cold drinks
  - ~14 menu items with ETB prices (Tibs, Shiro, Kitfo, Firfir, Chechebsa, Ful, Macchiato, Buna, Tea, Mango juice, Avocado juice …)
  - ~10 ingredients with units and low-stock thresholds (beef, berbere, niter kibbeh, injera, shiro powder, coffee beans, milk, sugar, mango, avocado)
  - Recipes linking every menu item to its ingredients
  - 4 users: waiter, cook, manager, owner — demo emails and one shared demo password, listed in `supabase/README.md`
- `shared/database.types.ts` generated; `shared/constants.ts` with roles and order statuses.

## UI designer builds

- `design/tokens.ts` — colors (incl. fixed status colors), spacing, radius, font sizes.
- Nothing else this slice; screens start in slice 2.

## Done when

1. `supabase migration list` shows the migrations applied on the remote project.
2. Each of the 4 demo users can sign in with email + password and gets back the right `role`.
3. Signed in as the **waiter**: can read the menu and tables; **cannot** read ingredients or add stock.
4. Signed in as the **owner**: can read everything.
5. Reading the menu returns 14-ish items across 4 categories with ETB prices.
6. `shared/database.types.ts` and `design/tokens.ts` exist and `code-quality` passes the slice.
