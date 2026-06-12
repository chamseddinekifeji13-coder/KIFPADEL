-- Product rule: reservations last 90 minutes (overrides 20260506205500_default_booking_duration_60).
alter table public.clubs
alter column slot_duration_minutes set default 90;

update public.clubs
set slot_duration_minutes = 90
where slot_duration_minutes = 60;
