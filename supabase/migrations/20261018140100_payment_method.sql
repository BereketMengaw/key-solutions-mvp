-- Key Solutions demo: how an order was paid.
--
-- A label only (no real payment). The waiter sends it in the same update that marks
-- the order paid:
--   supabase.from('orders').update({ status: 'paid', payment_method: 'telebirr' }).eq('id', id)
-- It is required for 'paid' and rejected on every other change.

create type public.payment_method as enum ('cash', 'telebirr', 'cbe_birr');

alter table public.orders
  add column payment_method public.payment_method,
  add constraint orders_paid_has_payment_method
    check ((status = 'paid') = (payment_method is not null));

grant update (payment_method) on public.orders to authenticated;

-- New orders never carry a payment method.
create or replace function public.orders_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := 'sent';
  new.created_at := now();
  new.updated_at := now();
  new.preparing_at := null;
  new.ready_at := null;
  new.served_at := null;
  new.paid_at := null;
  new.payment_method := null;
  return new;
end;
$$;

-- Same rules as before, plus: payment_method is set exactly when the order becomes paid.
create or replace function public.orders_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  statuses public.order_status[] := enum_range(null::public.order_status);
  r public.app_role := public.auth_role();
begin
  if new.table_id <> old.table_id
     or new.waiter_id <> old.waiter_id
     or new.created_at <> old.created_at
     or new.client_ref is distinct from old.client_ref then
    raise exception 'Only an order''s status can change';
  end if;

  -- Timestamps are owned by this trigger.
  new.preparing_at := old.preparing_at;
  new.ready_at := old.ready_at;
  new.served_at := old.served_at;
  new.paid_at := old.paid_at;

  if new.status <> old.status then
    if array_position(statuses, new.status) <> array_position(statuses, old.status) + 1 then
      raise exception 'Order status cannot go from % to %', old.status, new.status;
    end if;

    -- auth.uid() is null for service-role / SQL maintenance; skip the role check then.
    if auth.uid() is not null then
      if r = 'cook' and new.status not in ('preparing', 'ready') then
        raise exception 'A cook can only mark orders preparing or ready';
      elsif r = 'waiter' and new.status not in ('served', 'paid') then
        raise exception 'A waiter can only mark orders served or paid';
      elsif r is null then
        raise exception 'No staff profile for this user';
      end if;
    end if;

    case new.status
      when 'preparing' then new.preparing_at := now();
      when 'ready' then new.ready_at := now();
      when 'served' then new.served_at := now();
      when 'paid' then new.paid_at := now();
      else null;
    end case;
  end if;

  if new.status = 'paid' and old.status <> 'paid' then
    if new.payment_method is null then
      raise exception 'Choose how the order was paid: cash, telebirr or cbe_birr'
        using errcode = '22023';
    end if;
  elsif new.payment_method is distinct from old.payment_method then
    raise exception 'Payment method can only be set when marking the order paid'
      using errcode = '22023';
  end if;

  new.updated_at := now();
  return new;
end;
$$;
