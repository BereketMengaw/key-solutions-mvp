-- Key Solutions demo: removing a user's role removes their access.
--
-- Before this, clearing or breaking app_metadata.role left the old profile (and its
-- role) in place, so the user kept access. Now, when the role is set to anything that
-- is not a staff role:
--   - the profile is deleted, if nothing references it;
--   - otherwise (orders or stock movements point at it) the profile is kept for history
--     and demoted: role becomes null.
-- Either way public.auth_role() returns null, and every RLS policy, trigger and RPC
-- already treats null as "no access".

alter table public.profiles alter column role drop not null;

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
  elsif tg_op = 'UPDATE' then
    begin
      delete from public.profiles where id = new.id;
    exception when foreign_key_violation then
      -- Orders or stock movements reference this person: keep the name, drop the access.
      update public.profiles set role = null where id = new.id;
    end;
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
