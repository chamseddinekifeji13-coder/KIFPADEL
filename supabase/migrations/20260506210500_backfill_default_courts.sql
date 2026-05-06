-- Ensure every club has at least one court so booking slots can be selected.
insert into public.courts (club_id, label, surface, is_indoor)
select c.id, 'Terrain 1', 'standard', false
from public.clubs c
where not exists (
  select 1
  from public.courts court
  where court.club_id = c.id
);
