# Slices

The PM writes one spec per slice here (`NN-name.md`) before any agent starts.
Each spec has: goal, screens, data, and a "Done when" test run for real.

| # | Slice | Done when | Status |
|---|---|---|---|
| 0 | Team setup | Repo skeleton, agents, CLAUDE.md, Supabase project linked | done |
| 1 | Backend + menu + logins | Waiter, cook and owner logins work; menu and tables seeded | done |
| 2 | Waiter app | Log in → pick table → add items → send; order saved | done |
| 3 | Cook screen | Order appears live on tablet; Ready shows on waiter's phone | done |
| 4 | Stock | Orders deduct ingredients; owner adds stock on web; low stock flagged | done |
| 5 | Owner dashboard | Sales today, top items, live orders, stock alerts | done |
| 6 | Polish + demo | Amharic/English switch, APK, website live on Vercel | done |

## Workflow per slice

1. PM writes the spec → Bereket approves
2. `ui-designer` designs the screens
3. `backend` builds data + publishes types to `shared/`
4. `mobile` and `web` build in parallel
5. `code-quality` reviews → failures go back to the owner
6. PM runs "Done when" with Bereket → merge to `main`
