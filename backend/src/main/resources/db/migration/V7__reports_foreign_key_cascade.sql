-- Fix reports foreign keys to cascade on property or reported user deletion,
-- preventing constraint violations with chk_reports_target when resources are purged.

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_property_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reported_user_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_reported_user_id_fkey
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE;
