-- Migration to add slot configuration to clubs
alter table public.clubs 
add column if not exists slot_duration_minutes integer not null default 90,
add column if not exists opening_time time not null default '08:00',
add column if not exists closing_time time not null default '23:00';

-- Update existing clubs with defaults if necessary (though default handles it)
update public.clubs 
set 
  slot_duration_minutes = 90,
  opening_time = '08:00',
  closing_time = '23:00'
where slot_duration_minutes is null;
