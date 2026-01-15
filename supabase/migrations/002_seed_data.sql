-- Life OS Seed Data
-- Run this after 001_create_tables.sql to add test data

-- ============================================
-- CREATE DEFAULT USER
-- ============================================

INSERT INTO users (id, email, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'aditya@example.com', 'Aditya')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- SAMPLE TASKS
-- ============================================

INSERT INTO items (user_id, type, title, category, urgency, status, due_date) VALUES
  ('00000000-0000-0000-0000-000000000001', 'task', 'Call dentist to reschedule filling appointment', 'Health', 'high', 'not_started', NOW() + INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000001', 'task', 'Car registration renewal', 'Car', 'medium', 'not_started', NOW() + INTERVAL '7 days'),
  ('00000000-0000-0000-0000-000000000001', 'task', 'Review quarterly budget', 'Finance', 'medium', 'not_started', NOW() + INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000001', 'task', 'Schedule vet appointment for Dobby', 'Family', 'low', 'not_started', NOW() + INTERVAL '14 days'),
  ('00000000-0000-0000-0000-000000000001', 'task', 'Send thank you note to Mom', 'Family', 'low', 'not_started', NULL);

-- ============================================
-- SAMPLE EVENTS
-- ============================================

INSERT INTO items (user_id, type, title, category, status, due_date, people_mentioned) VALUES
  ('00000000-0000-0000-0000-000000000001', 'event', 'Dinner with Anjali at Osteria Francescana', 'Personal', 'not_started', NOW() + INTERVAL '2 days' + INTERVAL '19 hours', ARRAY['Anjali']),
  ('00000000-0000-0000-0000-000000000001', 'event', 'Team standup', 'Work', 'not_started', NOW() + INTERVAL '1 day' + INTERVAL '10 hours', NULL),
  ('00000000-0000-0000-0000-000000000001', 'event', 'Coffee with Dad', 'Family', 'not_started', NOW() + INTERVAL '5 days' + INTERVAL '14 hours', ARRAY['Dad']);

-- ============================================
-- SAMPLE IDEAS
-- ============================================

INSERT INTO items (user_id, type, title, category, subcategory, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'idea', 'Dune Part 2', 'Ideas', 'Movies', 'not_started'),
  ('00000000-0000-0000-0000-000000000001', 'idea', 'The Three Body Problem by Liu Cixin', 'Ideas', 'Books', 'not_started'),
  ('00000000-0000-0000-0000-000000000001', 'idea', 'Try the new ramen place on Main St', 'Ideas', 'Restaurants', 'not_started'),
  ('00000000-0000-0000-0000-000000000001', 'idea', 'Noise cancelling headphones for travel', 'Ideas', 'Products', 'not_started'),
  ('00000000-0000-0000-0000-000000000001', 'idea', 'Visit Joshua Tree National Park', 'Ideas', 'Places', 'not_started');

-- ============================================
-- SAMPLE REFERENCE
-- ============================================

INSERT INTO items (user_id, type, title, description, category, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'reference', 'Home wifi password', 'Network: HomeNetwork_5G, Password: sunny2024!', 'Home', 'not_started'),
  ('00000000-0000-0000-0000-000000000001', 'reference', 'Car tire size', '225/45R17 - Michelin Pilot Sport 4', 'Car', 'not_started'),
  ('00000000-0000-0000-0000-000000000001', 'reference', 'Anjali favorite flowers', 'Pink peonies or white roses', 'Personal', 'not_started');
