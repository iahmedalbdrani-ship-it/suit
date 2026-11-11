-- Phone sign-in (SMS one-time codes). Additive only.
ALTER TABLE users ADD COLUMN phone_e164 TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_e164 ON users(phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE TABLE IF NOT EXISTS phone_otps (id TEXT PRIMARY KEY, phone_e164 TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, resend_at TEXT NOT NULL, sends INTEGER NOT NULL DEFAULT 1, consumed_at TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE IF NOT EXISTS rate_events (key TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS rate_events_key ON rate_events(key, at);
