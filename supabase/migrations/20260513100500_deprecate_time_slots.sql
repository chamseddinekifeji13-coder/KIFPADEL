-- Sprint 1 P0 — Migration 6/6
-- time_slots is not used by the KIFPADEL application.
-- Availability is computed dynamically from courts + bookings in availability-service.ts.
-- Mark as deprecated. Do NOT drop to avoid breaking any direct DB tooling.

COMMENT ON TABLE public.time_slots IS
  'DEPRECATED — Not used by KIFPADEL application. Availability is computed dynamically from courts + bookings. May be dropped in a future migration.';
