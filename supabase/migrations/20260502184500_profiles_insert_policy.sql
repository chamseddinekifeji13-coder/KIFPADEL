-- Policy to allow users to create their own profile if it doesn't exist
drop policy if exists "profiles_insert_self" on public.profiles;
do $pol$
declare
  pk_col text;
begin
  select c.column_name into pk_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'profiles'
    and c.column_name in ('id', 'user_id')
  order by case c.column_name when 'id' then 0 else 1 end
  limit 1;

  if pk_col is null then
    raise exception 'profiles_insert_policy: profiles PK column id/user_id missing';
  end if;

  execute format(
    $q$
      create policy "profiles_insert_self"
        on public.profiles for insert
        with check (auth.uid() = %I)
    $q$,
    pk_col
  );
end $pol$;
