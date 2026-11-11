-- Property types (villa/loft) via a new unit_type column, pause flag, and payment webhook idempotency.
-- Additive only: no table is dropped or rebuilt (listings has ON DELETE CASCADE children).
ALTER TABLE listings ADD COLUMN unit_type TEXT NOT NULL DEFAULT 'apartment';
UPDATE listings SET unit_type = property_type;
ALTER TABLE listings ADD COLUMN paused INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS payment_events (id TEXT PRIMARY KEY, payment_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
