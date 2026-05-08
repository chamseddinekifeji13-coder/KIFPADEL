-- Ensure bookings + trust_events match application expectations (RPC + server actions).

alter table public.bookings
  add column if not exists total_price numeric(12, 2),
  add column if not exists payment_method text;

alter table public.trust_events
  add column if not exists booking_id uuid references public.bookings (id) on delete set null;

create index if not exists trust_events_booking_id_idx on public.trust_events (booking_id);
