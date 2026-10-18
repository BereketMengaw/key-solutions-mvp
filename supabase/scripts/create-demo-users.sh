#!/usr/bin/env bash
# Creates (or resets) the 4 demo logins on the remote Supabase project.
# Re-runnable: existing users get their password, name and role reset.
#
# Usage (from the repo root):  bash supabase/scripts/create-demo-users.sh
# Needs: curl, jq, and SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

: "${SUPABASE_URL:?SUPABASE_URL missing in .env}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY missing in .env}"

PASSWORD="${DEMO_PASSWORD:-KeyDemo2026!}"
AUTH=(-H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json")

# email|full name|role
USERS=(
  "waiter@keysolutions.demo|Hana Tesfaye|waiter"
  "cook@keysolutions.demo|Dawit Bekele|cook"
  "manager@keysolutions.demo|Selam Girma|manager"
  "owner@keysolutions.demo|Abebe Kebede|owner"
)

existing="$(curl -sf "${AUTH[@]}" "$SUPABASE_URL/auth/v1/admin/users?per_page=1000")"

for entry in "${USERS[@]}"; do
  IFS='|' read -r email name role <<<"$entry"

  body="$(jq -n --arg e "$email" --arg p "$PASSWORD" --arg n "$name" --arg r "$role" \
    '{email: $e, password: $p, email_confirm: true, user_metadata: {full_name: $n}, app_metadata: {role: $r}}')"

  id="$(jq -r --arg e "$email" '.users[] | select(.email == $e) | .id' <<<"$existing")"

  if [[ -z "$id" ]]; then
    id="$(curl -sf "${AUTH[@]}" -X POST "$SUPABASE_URL/auth/v1/admin/users" -d "$body" | jq -r '.id')"
    action="created"
  else
    curl -sf "${AUTH[@]}" -X PUT "$SUPABASE_URL/auth/v1/admin/users/$id" -d "$body" >/dev/null
    action="updated"
  fi

  # The signup trigger makes the profile on create; upsert keeps name + role right on re-runs.
  curl -sf "${AUTH[@]}" -X POST "$SUPABASE_URL/rest/v1/profiles?on_conflict=id" \
    -H "Prefer: resolution=merge-duplicates,return=minimal" \
    -d "$(jq -n --arg i "$id" --arg n "$name" --arg r "$role" '{id: $i, full_name: $n, role: $r}')" >/dev/null

  printf '%-8s %-27s %s\n' "$action" "$email" "$role"
done
