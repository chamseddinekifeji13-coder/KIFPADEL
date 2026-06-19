-- Catégories tournoi : masculin / féminin / mixte dans un même événement.

alter table public.tournament_entries
  add column if not exists category text check (
    category is null or category in ('men_only', 'women_only', 'mixed')
  );

alter table public.tournament_solo_entries
  add column if not exists category text check (
    category is null or category in ('men_only', 'women_only', 'mixed')
  );

alter table public.tournament_matches
  add column if not exists category text check (
    category is null or category in ('men_only', 'women_only', 'mixed')
  );

alter table public.tournament_matches
  drop constraint if exists tournament_matches_round_position_unique;

create unique index if not exists tournament_matches_tournament_category_round_position_uidx
  on public.tournament_matches (
    tournament_id,
    coalesce(category, 'open'),
    round,
    position
  );

create index if not exists tournament_entries_tournament_category_idx
  on public.tournament_entries (tournament_id, category);

create index if not exists tournament_solo_entries_tournament_category_idx
  on public.tournament_solo_entries (tournament_id, category);

create index if not exists tournament_matches_tournament_category_idx
  on public.tournament_matches (tournament_id, category);
