-- ════════════════════════════════════════════════════════════════════════════
-- 07_appointments_fk_fix.sql
--
-- Root cause: migration 06 declared service_id and location_id as plain UUID
-- columns inside CREATE TABLE (lines 64, 67), then tried to add them again
-- via ALTER TABLE ADD COLUMN IF NOT EXISTS (lines 144, 172). Because the
-- columns already existed, ADD COLUMN was a no-op — the REFERENCES clause
-- was silently skipped. Result: no FK constraints, so PostgREST cannot
-- resolve the joins and returns 400.
--
-- This patch adds the two missing FK constraints.
-- Safe to run multiple times (drops constraint first if it already exists).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_service_id_fkey;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services_catalogue(id) ON DELETE SET NULL;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_location_id_fkey;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES service_locations(id) ON DELETE SET NULL;
