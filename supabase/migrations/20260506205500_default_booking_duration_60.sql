-- Align booking slots with the product rule: reservations last 60 minutes.
alter table public.clubs
alter column slot_duration_minutes set default 60;

update public.clubs
set slot_duration_minutes = 60
where slot_duration_minutes = 90;
