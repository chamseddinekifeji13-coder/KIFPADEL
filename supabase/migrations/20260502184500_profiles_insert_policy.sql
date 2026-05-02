-- Policy to allow users to create their own profile if it doesn't exist
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (auth.uid() = user_id);
