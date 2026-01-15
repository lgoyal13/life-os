-- Life OS Database Schema
-- Run this in Supabase SQL Editor to create the database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENUMS
-- ============================================

-- Item type enum
CREATE TYPE item_type AS ENUM ('task', 'event', 'idea', 'reference');

-- Item status enum
CREATE TYPE item_status AS ENUM ('not_started', 'in_progress', 'complete');

-- Urgency enum
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high');

-- ============================================
-- ITEMS TABLE
-- ============================================

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type item_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  status item_status NOT NULL DEFAULT 'not_started',
  urgency urgency_level,
  due_date TIMESTAMPTZ,
  people_mentioned TEXT[],
  notes TEXT,
  links TEXT[],
  calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Permissive policies for v1 (single user, no auth)
-- TODO: Update these when adding authentication
CREATE POLICY "Allow all for items" ON items FOR ALL USING (true);
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);

-- ============================================
-- REALTIME
-- ============================================

-- Enable realtime for items table
ALTER PUBLICATION supabase_realtime ADD TABLE items;

-- ============================================
-- INDEXES
-- ============================================

-- Indexes for common query patterns
CREATE INDEX items_type_idx ON items(type);
CREATE INDEX items_status_idx ON items(status);
CREATE INDEX items_user_id_idx ON items(user_id);
CREATE INDEX items_due_date_idx ON items(due_date);
CREATE INDEX items_urgency_idx ON items(urgency);
CREATE INDEX items_created_at_idx ON items(created_at DESC);
