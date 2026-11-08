-- Seasonal club pricing, "price follows the delivery date": a pack bought at the Feb–Jul discount covers 2 introductions
-- once the full-price months start, unless the club pays the difference. Both flags are server-only (billing fields).
alter table club2coach_club_vacancies add column if not exists pack_discounted boolean not null default false;
alter table club2coach_club_vacancies add column if not exists peak_topped_up boolean not null default false;
create or replace function protect_listing_billing_fields() returns trigger language plpgsql as $$
declare n jsonb := to_jsonb(new); o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end; k text; dflt jsonb;
begin
  if current_user in ('authenticated', 'anon') and not coalesce(is_admin_caller(), false) then
    foreach k in array array['paid','paid_at','price_aud','refunded_at','activated_at','active_until','activations_used','founding_member','recredited_at','from_recredit','is_charity','verified_at'] loop
      if n ? k then
        dflt := case k when 'paid' then 'false'::jsonb when 'activations_used' then '0'::jsonb when 'founding_member' then 'false'::jsonb
                       when 'from_recredit' then 'false'::jsonb when 'is_charity' then 'false'::jsonb
                       when 'pack_discounted' then 'false'::jsonb when 'peak_topped_up' then 'false'::jsonb else 'null'::jsonb end;
        n := jsonb_set(n, array[k], coalesce(o -> k, dflt));
      end if;
    end loop;
    if n ? 'included_introductions' then
      if tg_op = 'UPDATE' and coalesce((o ->> 'paid')::boolean, false) then
        n := jsonb_set(n, array['included_introductions'], coalesce(o -> 'included_introductions', 'null'::jsonb));
      elsif (n ->> 'included_introductions') is not null then
        n := jsonb_set(n, array['included_introductions'], to_jsonb(least(greatest((n ->> 'included_introductions')::int, 0), 5)));
      end if;
    end if;
    if n ? 'max_mentees' then
      if tg_op = 'UPDATE' and coalesce((o ->> 'paid')::boolean, false) then
        n := jsonb_set(n, array['max_mentees'], coalesce(o -> 'max_mentees', 'null'::jsonb));
      elsif (n ->> 'max_mentees') is not null then
        n := jsonb_set(n, array['max_mentees'], to_jsonb(least(greatest((n ->> 'max_mentees')::int, 1), 10)));
      end if;
    end if;
    if n ? 'status' then
      if tg_op = 'INSERT' then n := jsonb_set(n, array['status'], '"draft"'::jsonb);
      elsif (o ->> 'status') = 'refunded' then n := jsonb_set(n, array['status'], o -> 'status');
      elsif (n ->> 'status') in ('active', 'expired', 'refunded') and (n ->> 'status') is distinct from (o ->> 'status') then
        n := jsonb_set(n, array['status'], o -> 'status');
      end if;
    end if;
    new := jsonb_populate_record(new, n);
  end if;
  return new;
end;
$$;
