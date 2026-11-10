-- Suitly — PostgreSQL schema for production (e.g. Supabase / Neon / RDS).
-- Mirrors lib/db/schema.ts. Money is stored in halalas (integer). Dates of stay are DATE.
-- The exclusion constraint makes double bookings impossible at the database level.

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email CITEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('guest','host','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cities (
  slug TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL,
  region_ar TEXT NOT NULL, region_en TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
  sort INT NOT NULL DEFAULT 0
);

CREATE TABLE listings (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  host_id BIGINT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  review_note TEXT,
  title_ar TEXT NOT NULL, title_en TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '', description_en TEXT NOT NULL DEFAULT '',
  city_slug TEXT NOT NULL REFERENCES cities(slug),
  district_ar TEXT NOT NULL DEFAULT '', district_en TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  bedrooms INT NOT NULL DEFAULT 1, beds INT NOT NULL DEFAULT 1, bathrooms INT NOT NULL DEFAULT 1,
  max_guests INT NOT NULL DEFAULT 2, area_sqm INT,
  amenities JSONB NOT NULL DEFAULT '[]',
  base_price INT NOT NULL CHECK (base_price > 0),
  weekend_price INT,
  cleaning_fee INT NOT NULL DEFAULT 0,
  min_nights INT NOT NULL DEFAULT 1, max_nights INT NOT NULL DEFAULT 30,
  weekly_discount INT NOT NULL DEFAULT 0, monthly_discount INT NOT NULL DEFAULT 0,
  cancellation_policy TEXT NOT NULL DEFAULT 'moderate' CHECK (cancellation_policy IN ('flexible','moderate','strict')),
  check_in_time TIME NOT NULL DEFAULT '15:00', check_out_time TIME NOT NULL DEFAULT '12:00',
  house_rules_ar TEXT NOT NULL DEFAULT '', house_rules_en TEXT NOT NULL DEFAULT '',
  featured BOOLEAN NOT NULL DEFAULT false, is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX listings_city_status ON listings(city_slug, status);

CREATE TABLE photos (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort INT NOT NULL DEFAULT 0
);

CREATE TABLE calendar_days (
  listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  blocked BOOLEAN NOT NULL DEFAULT false,
  price INT,
  PRIMARY KEY (listing_id, date)
);

CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  listing_id BIGINT NOT NULL REFERENCES listings(id),
  guest_id BIGINT NOT NULL REFERENCES users(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL CHECK (check_out > check_in),
  nights INT NOT NULL, guests INT NOT NULL,
  guest_name TEXT NOT NULL, guest_phone TEXT NOT NULL, notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending_payment','confirmed','cancelled','expired','payment_failed','payment_conflict')),
  hold_expires_at TIMESTAMPTZ,
  price_json JSONB NOT NULL,
  total INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  cancellation_policy TEXT NOT NULL,
  cancelled_by TEXT, cancelled_at TIMESTAMPTZ, refund_amount INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Confirmed bookings can never overlap. (Pending holds are additionally checked in the transaction.)
  CONSTRAINT no_overlapping_confirmed EXCLUDE USING gist (
    listing_id WITH =, daterange(check_in, check_out, '[)') WITH &&
  ) WHERE (status = 'confirmed')
);
CREATE INDEX bookings_guest ON bookings(guest_id);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id),
  provider TEXT NOT NULL,
  provider_ref TEXT, provider_payment_id TEXT,
  amount INT NOT NULL, currency TEXT NOT NULL DEFAULT 'SAR',
  status TEXT NOT NULL CHECK (status IN ('initiated','paid','failed','expired','refunded','refund_pending')),
  checkout_url TEXT, raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  booking_id BIGINT UNIQUE REFERENCES bookings(id),
  author_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'ar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
  handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
