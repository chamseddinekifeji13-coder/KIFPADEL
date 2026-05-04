-- Fix signup trigger to support both profiles.id and profiles.user_id schemas.
-- Run this in Supabase SQL Editor, then retry sign-up.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key_col text;
  v_has_global_role boolean;
  v_display_name text;
begin
  select
    case
      when exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profiles'
          and column_name = 'id'
      ) then 'id'
      when exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profiles'
          and column_name = 'user_id'
      ) then 'user_id'
      else null
    end
  into v_key_col;

  if v_key_col is null then
    raise exception 'profiles key column not found (expected id or user_id)';
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'global_role'
  )
  into v_has_global_role;

  v_display_name := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));

  if v_has_global_role then
    execute format(
      'insert into public.profiles (%I, display_name, email, global_role)
       values ($1, $2, $3, %L)
       on conflict (%I) do update
       set email = excluded.email,
           display_name = coalesce(public.profiles.display_name, excluded.display_name)',
      v_key_col,
      'player',
      v_key_col
    )
    using new.id, v_display_name, new.email;
  else
    execute format(
      'insert into public.profiles (%I, display_name, email)
       values ($1, $2, $3)
       on conflict (%I) do update
       set email = excluded.email,
           display_name = coalesce(public.profiles.display_name, excluded.display_name)',
      v_key_col,
      v_key_col
    )
    using new.id, v_display_name, new.email;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
