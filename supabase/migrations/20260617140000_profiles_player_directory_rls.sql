-- Annuaire joueurs : les comptes authentifiés peuvent voir les profils non suspendus (hors soi).

drop policy if exists "profiles_select_player_directory" on public.profiles;

create policy "profiles_select_player_directory"
  on public.profiles
  for select
  to authenticated
  using (
    auth.uid() is not null
    and auth.uid() <> id
    and suspended_at is null
    and coalesce(trim(display_name), '') <> ''
  );

comment on policy "profiles_select_player_directory" on public.profiles is
  'Joueurs connectés : découverte partenaires/adversaires (find-players).';
