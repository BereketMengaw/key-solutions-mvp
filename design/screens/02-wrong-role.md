# 02 — Wrong role

Route: `/wrong-role`. Reached only by `router.replace` from startup or Login.

## Purpose

A signed-in account that isn't a waiter lands here instead of the waiter screens. It
must look intentional (the client may sign in as the cook during the demo), say plainly
where that account belongs, and offer one way out: sign out.

Slice 3 replaces the **cook** case with the real kitchen screen. Manager/owner keep this
screen permanently (they use the website).

## Variants

Pick by `profiles.role` (use `Role` from `shared/constants.ts`).

| Case | Icon (Ionicons) | Title | Body |
|---|---|---|---|
| `cook` | `flame-outline` | `"This account is for the kitchen"` | `"Kitchen orders open on the kitchen tablet. To take orders on this phone, sign in with a waiter account."` |
| `manager` or `owner` | `stats-chart-outline` | `"This account is for the website"` | `"Sales, stock and live orders are on the Key Solutions website. To take orders on this phone, sign in with a waiter account."` |
| no profile / no role | `person-circle-outline` | `"This account isn't set up yet"` | `"Ask your manager to give it a role, then sign in again."` |

## Layout, top → bottom

Full screen `colors.background`, gutter `spacing[4]`.

1. Top spacer `insets.top + spacing[4]`.
2. **Who's signed in** (top-left, small, so the client sees whose account it is):
   - Row: avatar circle `size.tileSm` square, radius `radius.full`, bg
     `colors.surfaceMuted`, initials of `full_name` (first letter of first two words,
     `fontSize.md` `fontWeight.bold` `colors.textMuted`) + `spacing[3]` + a column:
     - `full_name` (e.g. `"Dawit Bekele"`) `fontSize.md` `fontWeight.semibold`
       `colors.text`;
     - role label `fontSize.sm` `colors.textMuted`: `"Cook"`, `"Manager"`, `"Owner"`.
       (Labels from the strings file, keyed by role.)
   - If `full_name` is empty, show the email instead and no initials (icon
     `person-outline` `size.iconLg` `colors.textMuted` in the circle).
   - No-profile variant: email only, no role line.
3. **Message block** — `flex: 1`, centered vertically in the remaining space:
   - Icon circle `size.heroCircle`, radius `radius.full`, bg `colors.primarySoft`, icon
     `size.iconXl` `colors.primary`. Centered.
   - `spacing[5]`, title `fontSize['2xl']` / `lineHeight['2xl']` `fontWeight.bold`
     `colors.text`, centered.
   - `spacing[3]`, body `fontSize.md` / `lineHeight.md` `colors.textMuted`, centered,
     `maxWidth: size.textBlock`.
4. **Bottom action** (thumb zone), padding bottom `insets.bottom + spacing[4]`:
   - `Button` `primary` full width, icon `log-out-outline`, `"Sign out"`.

## Behaviour

- **Sign out:** no confirmation (there is nothing to lose here). Button → loading
  `"Signing out…"` → `supabase.auth.signOut()` → clear secure store → `router.replace('/login')`.
  If sign-out fails (offline), clear the local session anyway and go to Login — the
  user must never be stuck here.
- Android hardware back: does nothing on this screen (there is nowhere to go back to).
- No other navigation, no tab bar.

## States

| State | What shows |
|---|---|
| **Default** | As above, by variant. |
| **Signing out** | Button loading `"Signing out…"`. |

## Copy (all strings)

- `"This account is for the kitchen"`
- `"Kitchen orders open on the kitchen tablet. To take orders on this phone, sign in with a waiter account."`
- `"This account is for the website"`
- `"Sales, stock and live orders are on the Key Solutions website. To take orders on this phone, sign in with a waiter account."`
- `"This account isn't set up yet"`
- `"Ask your manager to give it a role, then sign in again."`
- Role labels: `"Waiter"`, `"Cook"`, `"Manager"`, `"Owner"`
- `"Sign out"`, `"Signing out…"`
