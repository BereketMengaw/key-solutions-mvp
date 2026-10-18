# 02 — Login (and startup)

Route: `/login` (outside the waiter tabs). Also covers the startup check that runs before
any screen.

## Purpose

Sign a staff member in with email + password and send them to the right screen for their
role. It is the first thing the client sees: calm, warm, branded — not a form on a white
page.

## Routing after sign-in (and at startup)

1. Read the session from `expo-secure-store`.
2. No session → Login.
3. Session → fetch `profiles` row for `auth.uid()` (`full_name`, `role`).
   - `role = 'waiter'` → `router.replace` to the waiter tabs, Tables tab.
   - `role` is `cook`, `manager` or `owner` → `router.replace('/wrong-role')`.
   - No profile row, or the fetch fails with "not found" → `/wrong-role` with the
     "not set up" variant (see `02-wrong-role.md`).
   - Network error → stay on the startup screen and show its error state.
4. Always `replace`, never `push`: Back from Tables must not return to Login.

Use the `ROLES` / `Role` types from `shared/constants.ts`, never string literals.

## Startup screen (while checking the session)

Shown for as long as steps 1–3 take; no minimum time.

- Full screen `colors.background`, content centered vertically and horizontally.
- `BrandMark` (below), then `spacing[4]`, wordmark text `"Key Solutions"`
  `fontSize['2xl']` / `lineHeight['2xl']` `fontWeight.bold` `colors.text`.
- `spacing[8]`, `ActivityIndicator` `size="small"` `color={colors.primary}`.
- **Error** (profile fetch failed for network reasons): replace the spinner with
  - `"Can't reach the server"` `fontSize.md` `fontWeight.semibold` `colors.text`,
  - `spacing[1]`, `"Check your connection and try again."` `fontSize.sm`
    `colors.textMuted`,
  - `spacing[4]`, `Button` `secondary` (not full width) `"Try again"` → reruns step 3.
  - and a `ghost` `"Sign out"` under it → clears session → Login.

Hide the Expo splash only once this screen has rendered (no white flash between them).

## BrandMark

Used on Login and startup. Built from Views and Text — no image asset.

- Square `size.brandMark`, radius `radius.lg`, bg `colors.primary`, `shadows.md`.
- Inside, centered: `"K"` `fontSize['3xl']` / `lineHeight['3xl']` `fontWeight.bold`
  `colors.textOnPrimary`.
- Bottom-right corner accent: a circle `spacing[3]` square, radius `radius.full`, bg
  `colors.primarySoft`, positioned `spacing[2]` from the bottom and right edges — reads
  as a key's bit / a coffee bean. Purely decorative.
- `accessibilityLabel="Key Solutions"`.

## Layout, top → bottom

The screen is a `KeyboardAvoidingView` (`behavior="padding"` on iOS, `"height"` on
Android) wrapping a `ScrollView` with `keyboardShouldPersistTaps="handled"`,
`contentContainerStyle={{ flexGrow: 1 }}`. Gutter `spacing[4]`.

**Brand block** — top area, takes the remaining height above the form (`flex: 1`,
content aligned to the bottom of this area so the brand sits close to the form, with at
least `insets.top + spacing[12]` above it).

1. `BrandMark`, left-aligned.
2. `spacing[6]`, `"Key Solutions"` `fontSize['3xl']` / `lineHeight['3xl']`
   `fontWeight.bold` `colors.text`.
3. `spacing[2]`, `"Orders, kitchen and stock for your restaurant."` `fontSize.md` /
   `lineHeight.md` `colors.textMuted`.

**Form card** — sits in the lower half (thumb zone). `spacing[8]` below the brand block.

- Card: bg `colors.surface`, radius `radius.xl`, padding `spacing[5]`, border 1
  `colors.border`, `shadows.md`.
4. `"Sign in"` `fontSize.xl` / `lineHeight.xl` `fontWeight.bold` `colors.text`.
5. `spacing[1]`, `"Use the account your manager gave you."` `fontSize.sm`
   `colors.textMuted`.
6. `spacing[5]`, **Error banner slot** (only when there is a form-level error; see
   States) followed by `spacing[4]`.
7. `TextField` **Email**
   - Label `"Email"`, placeholder `"name@restaurant.com"`.
   - `keyboardType="email-address"`, `autoCapitalize="none"`, `autoCorrect={false}`,
     `autoComplete="email"`, `textContentType="emailAddress"`, `returnKeyType="next"`
     (focuses Password).
8. `spacing[4]`, `TextField` **Password** (password variant)
   - Label `"Password"`, placeholder none.
   - `secureTextEntry` (toggle), `autoComplete="password"`,
     `textContentType="password"`, `returnKeyType="go"` (submits).
9. `spacing[6]`, `Button` `primary` full width `"Sign in"`.

**Footer** — below the card, `spacing[6]` gap, then `insets.bottom + spacing[4]`.

10. `"Key Solutions · Addis Ababa"` `fontSize.xs` `colors.textSubtle` centered.

On a typical phone (≥ 700 dp tall) everything fits with no scroll; the Sign in button is
in the lower third. When the keyboard is open, the form card is pushed above it and the
brand block may scroll off — that's fine.

## Behaviour

- Trim the email before sending. Don't trim the password.
- Tap **Sign in** (or `go` on the keyboard):
  1. Validate locally (below). If invalid, show field errors, focus the first bad field,
     stop.
  2. `Keyboard.dismiss()`, enter **Signing in**.
  3. `supabase.auth.signInWithPassword`. On success run the routing above.
- No "Forgot password", no "Sign up", no "Remember me" (session is always remembered).

## States

| State | What shows |
|---|---|
| **Default** | Empty fields, button enabled. |
| **Field error — empty email** | Email field error state, message `"Enter your email."` |
| **Field error — email without `@`** | `"Enter a valid email, like name@restaurant.com."` |
| **Field error — empty password** | Password field error, `"Enter your password."` |
| **Signing in** | Button loading, label `"Signing in…"`. Both fields disabled. Password toggle disabled. Hardware back ignored. |
| **Wrong email or password** (`invalid_credentials` / 400) | `Banner` `error`, title `"Email or password is incorrect"`, body `"Check them and try again."` Password field cleared and focused; email kept. No field-level red borders (we don't know which one is wrong). |
| **Network / server error** (fetch failed, 5xx, timeout 15 s) | `Banner` `error`, title `"Can't reach the server"`, body `"Check your connection and try again."` Fields kept as typed. |
| **Too many attempts** (429) | `Banner` `error`, title `"Too many tries"`, body `"Wait a minute, then try again."` |
| **Signed in, profile loading** | Button stays in loading state until routing happens (no flash back to Default). |

- The banner clears when the user edits either field.
- The banner announces itself to screen readers (`accessibilityRole="alert"`).
- Never show raw Supabase error text.

## Accessibility

- Order: Email → Password → show/hide → Sign in.
- Field labels are real `Text` elements linked by `accessibilityLabelledBy` /
  `aria-labelledby` (or `accessibilityLabel` on the input with the same text).

## Copy (all strings)

- `"Key Solutions"`
- `"Orders, kitchen and stock for your restaurant."`
- `"Sign in"` (heading and button)
- `"Use the account your manager gave you."`
- `"Email"`, `"name@restaurant.com"`, `"Password"`
- `"Show password"`, `"Hide password"`
- `"Signing in…"`
- `"Enter your email."`, `"Enter a valid email, like name@restaurant.com."`,
  `"Enter your password."`
- `"Email or password is incorrect"`, `"Check them and try again."`
- `"Can't reach the server"`, `"Check your connection and try again."`
- `"Too many tries"`, `"Wait a minute, then try again."`
- `"Try again"`, `"Sign out"`
- `"Key Solutions · Addis Ababa"`
