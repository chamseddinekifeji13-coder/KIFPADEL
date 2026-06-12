-- Encaissement validé par le staff club (par joueur / place).

alter table public.booking_participants
  add column if not exists payment_confirmed_at timestamptz;

comment on column public.booking_participants.payment_confirmed_at is
  'Horodatage de validation encaissement par le staff club pour cette place.';
