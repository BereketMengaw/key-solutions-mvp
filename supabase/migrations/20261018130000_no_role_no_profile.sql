-- Key Solutions demo: only users given a staff role get a profile.
--
-- Before this, a user with no app_metadata.role fell back to 'waiter' and could
-- create orders and read staff names. Now no role means no profile row, so
-- public.auth_role() is null, and every RLS policy and RPC treats that as "no access".
--
-- The admin API (scripts/create-demo-users.sh) inserts the auth user first and sets
-- app_metadata in a follow-up update, so the profile is also made/updated when the
-- role in app_metadata changes, not only on insert.

alter table public.profiles alter column role drop default;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := new.raw_app_meta_data ->> 'role';
begin
  -- Role comes only from app_metadata (service-role only), never user_metadata.
  if requested in ('waiter', 'cook', 'manager', 'owner') then
    insert into public.profiles (id, full_name, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      requested::public.app_role
    )
    on conflict (id) do update set role = excluded.role;
  end if;
  return new;
end;
$$;

-- on_auth_user_created (insert) already exists and now calls the function above.
create trigger on_auth_user_role_changed
  after update of raw_app_meta_data on auth.users
  for each row
  when (old.raw_app_meta_data ->> 'role' is distinct from new.raw_app_meta_data ->> 'role')
  execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
