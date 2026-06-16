-- public.users est référencé par bookings.created_by (legacy) mais n'était jamais rempli
-- à l'inscription → violation FK lors de create_booking_atomic.

insert into public.users (id, email, phone, display_name, system_role, created_at, updated_at)
select
  p.id,
  coalesce(
    nullif(trim(p.email), ''),
    nullif(trim(u.email), ''),
    p.id::text || '@users.sync'
  ),
  p.phone,
  coalesce(nullif(trim(p.display_name), ''), split_part(coalesce(u.email, ''), '@', 1), 'Joueur'),
  case
    when coalesce(p.global_role::text, 'player') = 'super_admin'
      then 'super_admin'::public.system_role
    else 'player'::public.system_role
  end,
  coalesce(p.created_at, now()),
  now()
from public.profiles p
left join auth.users u on u.id = p.id
on conflict (id) do update set
  email = excluded.email,
  phone = excluded.phone,
  display_name = excluded.display_name,
  system_role = excluded.system_role,
  updated_at = now();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1),
    'Joueur'
  );

  insert into public.profiles (id, display_name, email)
  values (new.id, v_display_name, new.email)
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    display_name = coalesce(public.profiles.display_name, excluded.display_name);

  insert into public.users (id, email, display_name, system_role, created_at, updated_at)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@auth.sync'),
    v_display_name,
    'player'::public.system_role,
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(public.users.display_name, excluded.display_name),
    updated_at = now();

  return new;
end;
$$;
