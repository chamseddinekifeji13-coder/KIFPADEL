-- Scores par set pour les résultats de match (tournois et matchs ouverts).

alter table public.match_results
  add column if not exists set_scores jsonb;

comment on column public.match_results.set_scores is
  'Jeux par set : [{"a":6,"b":4},{"a":7,"b":5}]. Le vainqueur du match est dérivé côté app.';

-- Les participants confirmés peuvent aussi valider un résultat (matchs ouverts).
drop policy if exists "match_results_insert_staff_or_creator" on public.match_results;
create policy "match_results_insert_staff_or_creator"
  on public.match_results for insert
  with check (
    validated_by = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = match_id
        and (
          m.created_by = auth.uid()
          or (
            m.club_id is not null
            and public.has_club_role(
              m.club_id,
              array['club_staff', 'club_manager', 'club_admin', 'platform_admin']::text[]
            )
          )
          or exists (
            select 1
            from public.match_participants mp
            where mp.match_id = m.id
              and mp.player_id = auth.uid()
              and mp.status::text in ('confirmed', 'completed', 'pending')
          )
        )
    )
  );
