# 04 — Website shell (login, frame, wrong role)

The frame every owner/manager page uses from now on, plus the pages around it. Same brand
as the app: berbere for actions, cream page, white cards, Noto Sans, the K mark.

Designed at **1440** and **1280** wide first; usable at **390** (phone). Class names are
Tailwind classes generated from `design/tokens.ts` (see `design/web-tailwind.md`).
Components (Button, TextField, NavItem, Avatar, Drawer, Banner, EmptyState…) are in
`design/components.md` → "Slice 4 — website components".

## Routes

| Route | Who | What |
|---|---|---|
| `/login` | signed out | Sign in. Signed-in visitors are redirected by role (below). |
| `/wrong-role` | signed-in waiter, cook, or no profile | "Use the mobile app". |
| `/stock` | manager, owner | The Stock page (`04-stock.md`). **Landing page this slice.** |
| `/dashboard` | manager, owner | Placeholder this slice (slice 5 fills it, then it becomes the landing page). |
| `/menu` | manager, owner | Placeholder. |
| `/` | anyone | Redirect: signed out → `/login`; manager/owner → `/stock`; others → `/wrong-role`. |

Role check runs **on the server** for every route in the `(app)` group (layout or
middleware): no session → `/login?next=<path>`; role not in `WEB_ROLES`
(`shared/constants.ts`) → `/wrong-role`. Use `ROLES` / `WEB_ROLES` / `Role`, never string
literals.

Browser tab titles: `"Sign in · Key Solutions"`, `"Stock · Key Solutions"`,
`"Dashboard · Key Solutions"`, `"Menu · Key Solutions"`,
`"Use the mobile app · Key Solutions"`.

Brand files (copy, don't edit): `design/brand/favicon.png` → `web/src/app/icon.png`;
`design/brand/mark.svg` → `web/public/mark.svg`. The mark is drawn as an `<img
src="/mark.svg" alt="">` with `rounded-md` (sm) or `rounded-lg` (64): the SVG is a
full-bleed berbere tile, so the radius gives it the app-icon look.

---

## 1. Login — `/login`

### Layout ≥ `lg` (1024+): split screen

```
┌───────────────────────────┬──────────────────────────────────────────┐
│ [K]  Key Solutions        │                                          │
│                           │            ┌──────────────────────┐      │
│                           │            │ Sign in              │      │
│ Orders, kitchen and       │            │ For owners and mana… │      │
│ stock for your            │            │                      │      │
│ restaurant.               │            │ Email                │      │
│                           │            │ [                  ] │      │
│ See today's sales, live   │            │ Password             │      │
│ orders and stock levels…  │            │ [               (o)] │      │
│                     ◯◯    │            │ [      Sign in     ] │      │
│ Key Solutions · Addis     │            └──────────────────────┘      │
│                           │   Waiters and cooks: use the app …       │
└───────────────────────────┴──────────────────────────────────────────┘
   5 fr, bg-primary                    7 fr, bg-background
```

`min-h-screen grid lg:grid-cols-[5fr_7fr]`.

**Brand panel** (left, hidden below `lg`): `relative overflow-hidden bg-primary
text-text-on-primary p-12 flex flex-col justify-between`.

1. Top row: mark `<img>` `size-brand-mark rounded-lg` (it blends into the panel — that is
   intended, the K floats on berbere) + `gap-4` + `"Key Solutions"` `text-xl font-bold`.
2. Middle block, `max-w-[28ch]` (a reading measure, the one arbitrary value on this
   page): headline `"Orders, kitchen and stock for your restaurant."`
   `text-3xl font-bold`, then `mt-4` body
   `"See today's sales, live orders and stock levels — updated the moment a waiter sends an order."`
   `text-lg text-primary-soft` (5.23:1).
3. Bottom: `"Key Solutions · Addis Ababa"` `text-sm text-primary-soft`.
4. Decoration (the "plate" motif from the app's item tiles): two circles,
   `absolute rounded-full border-2 border-primary-soft/15 pointer-events-none`,
   `aria-hidden`. Sizes as a share of the panel: 70% and 110% of the panel width,
   centred on the panel's bottom-right corner (`right-0 bottom-0 translate-x-1/2
   translate-y-1/2`, `aspect-square`). Nothing else in the panel — no screenshots, no
   stock photos.

**Form side** (right): `flex flex-col items-center justify-center px-6 py-12`.

1. Below `lg` only — brand block, left-aligned within the card's width:
   mark `size-brand-mark rounded-lg shadow-md`, `mt-6` `"Key Solutions"`
   `text-2xl font-bold`, `mt-2` `"Orders, kitchen and stock for your restaurant."`
   `text-md text-text-muted`, then `mb-8`.
2. **Card:** `w-full max-w-login-card bg-surface border border-border rounded-xl
   shadow-md p-8` (`p-6` below `md`). A `<form noValidate>`.
   - `"Sign in"` `<h1>` `text-2xl font-bold`.
   - `mt-1` `"For owners and managers."` `text-sm text-text-muted`.
   - `mt-6` error Banner slot (form-level errors only), then `mb-4`.
   - TextField **Email**: label `"Email"`, placeholder `"name@restaurant.com"`,
     `type="email" autoComplete="email" autoCapitalize="none" spellCheck={false}`.
   - `mt-4` TextField **Password** (password variant): label `"Password"`,
     `autoComplete="current-password"`.
   - `mt-6` Button `primary` size `lg`, full width, `type="submit"`, `"Sign in"`.
3. `mt-6`, below the card, `max-w-login-card text-center text-sm text-text-muted`:
   `"Waiters and cooks: use the Key Solutions app on your phone or tablet."`

**Phone (390):** no brand panel; the form side fills the screen, `px-4 py-8`,
`justify-start`. Card full width. Nothing scrolls sideways.

### Behaviour

- On load, focus the Email field (`autoFocus`).
- Enter in either field submits.
- Submit: trim the email (not the password) → validate (below; on failure show field
  errors, focus the first bad field, stop) → **Signing in** →
  `supabase.auth.signInWithPassword` → read `profiles.role` → route:
  - manager / owner → `next` param if it is a same-site path starting with `/`, else
    `/stock`;
  - waiter / cook / no profile → `/wrong-role`.
  Use `router.replace`, so Back doesn't return to the login form.
- No "Forgot password", no "Sign up", no "Remember me".

### States

| State | What shows |
|---|---|
| Default | Empty fields, Email focused. |
| Empty email | Email error `"Enter your email."` |
| Email without `@` | `"Enter a valid email, like name@restaurant.com."` |
| Empty password | `"Enter your password."` |
| Signing in | Button loading `"Signing in…"`; both fields and the show/hide button disabled. Stays loading through the profile fetch and redirect (no flash back). |
| Wrong email or password | Banner `error` `"Email or password is incorrect"` / `"Check them and try again."` Password cleared and focused, email kept. No red field borders. |
| Network / server error / 15 s timeout | Banner `"Can't reach the server"` / `"Check your connection and try again."` Fields kept. |
| Too many attempts (429) | Banner `"Too many tries"` / `"Wait a minute, then try again."` |
| Session expired (arrived via `/login?next=…&expired=1`) | Banner `info` `"You were signed out"` / `"Sign in again to continue."` |

The banner clears as soon as either field is edited. Never show raw Supabase text.

---

## 2. App frame — every `(app)` page

### Layout ≥ `lg` (1024+)

```
┌──────────────┬─────────────────────────────────────────────────────────┐
│ [K] Key      │                                                         │
│   Solutions  │   page content (max-w-content, centred)                 │
│   Restaurant │                                                         │
│   dashboard  │                                                         │
│              │                                                         │
│ ▣ Dashboard  │                                                         │
│ ▣ Stock   (1)│  ← active: primary-soft fill; (1) = low-stock count     │
│ ▣ Menu       │                                                         │
│              │                                                         │
│              │                                                         │
│ ──────────── │                                                         │
│ (AK) Abebe K │                                                         │
│      Owner   │                                                         │
│ ⎋ Sign out   │                                                         │
└──────────────┴─────────────────────────────────────────────────────────┘
  w-sidebar 240
```

- Root: `min-h-screen bg-background lg:grid lg:grid-cols-[var(--spacing-sidebar)_1fr]`.
- **Sidebar** (`<nav aria-label="Main">` inside an `<aside>`): `hidden lg:flex flex-col
  sticky top-0 h-screen bg-surface border-r border-border px-4 py-6`.
  1. Brand row, `px-2 flex items-center gap-3`: mark `size-brand-mark-sm rounded-md`
     + column: `"Key Solutions"` `text-md font-bold text-text`, `"Restaurant dashboard"`
     `text-xs text-text-muted`. The whole row links to `/stock` (landing).
  2. `mt-8` nav list (`<ul>` `flex flex-col gap-1`) of NavItems, in this order:

     | Label | Icon | Route | Extra |
     |---|---|---|---|
     | `"Dashboard"` | `stats-chart-outline` | `/dashboard` | — |
     | `"Stock"` | `cube-outline` | `/stock` | Low-stock count chip when ≥ 1 (live) |
     | `"Menu"` | `restaurant-outline` | `/menu` | — |

  3. `mt-auto` user block, `border-t border-border pt-4`:
     - Row `px-2 flex items-center gap-3`: Avatar + column: `full_name`
       `text-sm font-semibold text-text truncate`, role label `text-xs text-text-muted`
       (`"Owner"` / `"Manager"`, from the strings file keyed by role).
     - `mt-3` Button `ghost` size `sm`, full width, `justify-start`, icon
       `log-out-outline`, `"Sign out"`.
- **Main:** `<main id="main" className="min-w-0">`, inner wrapper `mx-auto w-full
  max-w-content px-8 py-8 xl:px-10`. At 1440 this makes the content exactly 1120 wide; at
  1280, 976.
- A skip link is the first focusable element on the page: `"Skip to content"` →
  `#main`, `sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50
  bg-surface px-4 py-2 rounded-md shadow-lg`.

### Layout below `lg` (phone and tablet)

```
┌──────────────────────────────────────┐
│ [K] Key Solutions               [≡]  │  top bar, h-top-bar, sticky
├──────────────────────────────────────┤
│ page content, px-4 (md: px-6)        │
```

- **Top bar:** `lg:hidden sticky top-0 z-40 h-top-bar bg-surface border-b border-border
  px-4 flex items-center justify-between`.
  - Left: mark `size-brand-mark-sm rounded-md` + `gap-3` + `"Key Solutions"`
    `text-md font-bold`.
  - Right: menu button `menu-outline` `size-icon-lg`, `size-12 rounded-full
    hover:bg-surface-muted`, `aria-label="Open menu"`, `aria-expanded`. If any
    ingredient is low, a `size-2 rounded-full bg-danger` dot sits on its top-right
    (the button's `aria-label` becomes `"Open menu, 1 ingredient low"`).
- **Nav drawer:** left Drawer (`w-sidebar`), content identical to the laptop sidebar
  (brand row, nav, user block), plus the Drawer close button top-right
  (`aria-label="Close menu"`). Opens from the menu button; closes on Esc, backdrop
  click, close button, or choosing a link. Focus moves to the active NavItem when it
  opens and back to the menu button when it closes.
- Main inner wrapper: `px-4 py-6 md:px-6`.

### Behaviour

- Active NavItem = the current path segment (`usePathname`), `aria-current="page"`.
- The **Stock** count chip and the top-bar dot use the same live ingredient data as the
  Stock page: put one `StockProvider` (initial fetch + Realtime subscription on
  `ingredients`) in the `(app)` layout, and let the Stock page read from it. The count =
  number of ingredients where `isLow` (rule in `components.md` → Formatting helpers).
- **Sign out:** no confirmation. Button loading `"Signing out…"` →
  `supabase.auth.signOut()` → `router.replace('/login')`. If it fails, clear the local
  session anyway and still go to `/login`.
- **Session ends mid-use** (any request returns 401 / the auth listener reports
  `SIGNED_OUT`): `router.replace('/login?next=<current path>&expired=1')`.

### States

| State | What shows |
|---|---|
| Loading (server render) | The frame renders immediately with the user block filled (the server already read the profile). Pages show their own skeletons. |
| Profile read fails on the server (network) | Frame without the user block; content area shows EmptyState error: `cloud-offline-outline`, `"Can't reach the server"`, `"Check your connection and try again."`, Button `secondary` `"Try again"` → `router.refresh()`. |
| User has no `full_name` | Avatar shows the person icon; the name line shows the email. |

---

## 3. Placeholder pages — `/dashboard`, `/menu`

Inside the frame. **Page header** (shared by every page, also used by Stock):
`flex flex-wrap items-end justify-between gap-4`; left: `<h1>` `text-2xl font-bold`,
`mt-1` subtitle `text-md text-text-muted`; right: page actions (none here).

Then `mt-8` a card `bg-surface border border-border rounded-xl py-16 px-6` with a
centred EmptyState:

| Page | `<h1>` | Subtitle | Icon | Title | Body | Button |
|---|---|---|---|---|---|---|
| Dashboard | `"Dashboard"` | `"Today at a glance"` | `stats-chart-outline` | `"Sales and live orders come next"` | `"Today's sales and the orders on the floor will show here."` | `secondary` `"Go to stock"` → `/stock` |
| Menu | `"Menu"` | `"Your dishes and prices"` | `restaurant-outline` | `"Menu editing comes later"` | `"Dishes, prices and recipes will be managed here."` | none |

---

## 4. Wrong role — `/wrong-role`

For a signed-in account that doesn't use the website. It must look deliberate (the client
may try the cook's login on the laptop).

### Layout (all widths)

`min-h-screen bg-background flex flex-col items-center px-4 py-8 md:py-16`, a column
`w-full max-w-login-card`:

1. Brand row (as in the sidebar): mark `size-brand-mark-sm rounded-md` + `"Key Solutions"`
   `text-md font-bold`. `mb-12`.
2. Card `bg-surface border border-border rounded-xl shadow-md p-8` (`p-6` below `md`),
   content centred:
   - Icon circle `size-hero-circle rounded-full bg-primary-soft`, icon `size-icon-xl
     text-primary` (by variant).
   - `mt-6` title `<h1>` `text-2xl font-bold text-text`.
   - `mt-3` body `text-md text-text-muted`.
   - `mt-6` **Who's signed in** box `bg-surface-muted rounded-lg p-4 flex items-center
     gap-3 text-left`: Avatar (`bg-surface` here) + column: `full_name` `text-sm
     font-semibold`, role label `text-xs text-text-muted` (no-profile variant: the email
     only, no role line).
   - `mt-6` Button `primary` size `md`, full width, icon `log-out-outline`,
     `"Sign out"` (loading `"Signing out…"`, same behaviour as the frame's sign out).

### Variants

| Case | Icon | Title | Body |
|---|---|---|---|
| `waiter` | `phone-portrait-outline` | `"This account is for the mobile app"` | `"Waiters take orders in the Key Solutions app on a phone. This website is for owners and managers."` |
| `cook` | `flame-outline` | `"This account is for the mobile app"` | `"Cooks use the kitchen screen in the Key Solutions app on a tablet. This website is for owners and managers."` |
| no profile / no role | `person-circle-outline` | `"This account isn't set up yet"` | `"Ask the owner to give it a role, then sign in again."` |

- Not signed in → redirect to `/login`. Manager/owner → redirect to `/stock`.
- No nav, no other links: sign out is the only way out.

---

## Copy (all strings, exact)

- `"Key Solutions"`, `"Restaurant dashboard"`, `"Key Solutions · Addis Ababa"`
- `"Orders, kitchen and stock for your restaurant."`
- `"See today's sales, live orders and stock levels — updated the moment a waiter sends an order."`
- `"Sign in"`, `"For owners and managers."`, `"Signing in…"`
- `"Email"`, `"name@restaurant.com"`, `"Password"`, `"Show password"`, `"Hide password"`
- `"Enter your email."`, `"Enter a valid email, like name@restaurant.com."`, `"Enter your password."`
- `"Email or password is incorrect"`, `"Check them and try again."`
- `"Can't reach the server"`, `"Check your connection and try again."`, `"Try again"`
- `"Too many tries"`, `"Wait a minute, then try again."`
- `"You were signed out"`, `"Sign in again to continue."`
- `"Waiters and cooks: use the Key Solutions app on your phone or tablet."`
- Nav: `"Dashboard"`, `"Stock"`, `"Menu"`; `"Main"` (nav label); `"low"` (sr-only after the count)
- `"Open menu"`, `"Open menu, 1 ingredient low"` / `"Open menu, 3 ingredients low"`, `"Close menu"`, `"Close"`
- `"Skip to content"`
- `"Sign out"`, `"Signing out…"`
- Role labels: `"Waiter"`, `"Cook"`, `"Manager"`, `"Owner"`
- Placeholders: `"Today at a glance"`, `"Sales and live orders come next"`,
  `"Today's sales and the orders on the floor will show here."`, `"Go to stock"`,
  `"Your dishes and prices"`, `"Menu editing comes later"`,
  `"Dishes, prices and recipes will be managed here."`
- Wrong role: `"This account is for the mobile app"`,
  `"Waiters take orders in the Key Solutions app on a phone. This website is for owners and managers."`,
  `"Cooks use the kitchen screen in the Key Solutions app on a tablet. This website is for owners and managers."`,
  `"This account isn't set up yet"`, `"Ask the owner to give it a role, then sign in again."`
- Tab titles: listed under Routes.
