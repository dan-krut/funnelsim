-- Database Schema Tests for Stripe Integration & Whitelabel System
-- These tests verify the database schema is correctly set up after migrations
-- Run these queries against your Supabase database to verify the schema

-- ============================================
-- Test 1: Subscription Tier Retrieval
-- Verifies that subscription tiers table exists and has seeded data
-- ============================================
-- Expected: Returns 3 rows (Free, Pro, Enterprise)

SELECT
  name,
  price_monthly,
  max_funnels,
  is_active,
  sort_order
FROM subscription_tiers
WHERE is_active = true
ORDER BY sort_order;

-- Verify Free tier exists with correct defaults
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM subscription_tiers
      WHERE name = 'Free'
        AND price_monthly = 0
        AND max_funnels = 3
        AND is_active = true
    ) THEN 'PASS: Free tier exists with correct values'
    ELSE 'FAIL: Free tier missing or has incorrect values'
  END AS test_free_tier;

-- Verify Pro tier exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM subscription_tiers
      WHERE name = 'Pro'
        AND price_monthly = 29
        AND max_funnels = 25
    ) THEN 'PASS: Pro tier exists with correct values'
    ELSE 'FAIL: Pro tier missing or has incorrect values'
  END AS test_pro_tier;

-- Verify Enterprise tier exists with unlimited funnels (-1)
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM subscription_tiers
      WHERE name = 'Enterprise'
        AND max_funnels = -1
    ) THEN 'PASS: Enterprise tier has unlimited funnels'
    ELSE 'FAIL: Enterprise tier missing or has incorrect funnel limit'
  END AS test_enterprise_tier;


-- ============================================
-- Test 2: User Subscription Table Structure
-- Verifies user_subscriptions table has correct structure and constraints
-- ============================================

-- Verify table has unique constraint on user_id
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE tablename = 'user_subscriptions'
        AND indexname = 'idx_user_subscriptions_user_unique'
    ) THEN 'PASS: Unique constraint on user_id exists'
    ELSE 'FAIL: Unique constraint on user_id missing'
  END AS test_user_unique_constraint;

-- Verify foreign key to subscription_tiers exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'user_subscriptions'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'subscription_tiers'
    ) THEN 'PASS: Foreign key to subscription_tiers exists'
    ELSE 'FAIL: Foreign key to subscription_tiers missing'
  END AS test_tier_fk;

-- Verify indexes exist on commonly queried columns
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'user_subscriptions'
        AND indexname = 'idx_user_subscriptions_status'
    ) THEN 'PASS: Index on status column exists'
    ELSE 'FAIL: Index on status column missing'
  END AS test_status_index;


-- ============================================
-- Test 3: Whitelabel Config Single-Row Constraint
-- Verifies only one row can exist in whitelabel_config
-- ============================================

-- Verify exactly one row exists
SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM whitelabel_config) = 1
    THEN 'PASS: Exactly one whitelabel_config row exists'
    ELSE 'FAIL: Expected 1 row in whitelabel_config, found ' || (SELECT COUNT(*) FROM whitelabel_config)::text
  END AS test_single_row;

-- Verify default brand name is seeded
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM whitelabel_config WHERE brand_name = 'FunnelSim'
    ) THEN 'PASS: Default brand name (FunnelSim) is seeded'
    ELSE 'FAIL: Default brand name not found'
  END AS test_default_brand;

-- Verify trigger exists to prevent multiple inserts
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'enforce_single_whitelabel_config_trigger'
    ) THEN 'PASS: Single-row constraint trigger exists'
    ELSE 'FAIL: Single-row constraint trigger missing'
  END AS test_single_row_trigger;


-- ============================================
-- Test 4: Admin Users Table and Lookup
-- Verifies admin_users table structure
-- ============================================

-- Verify admin_users table exists with correct columns
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'admin_users'
        AND column_name = 'is_admin'
        AND data_type = 'boolean'
    ) THEN 'PASS: admin_users table has is_admin boolean column'
    ELSE 'FAIL: admin_users table missing is_admin column or wrong type'
  END AS test_admin_column;

-- Verify unique constraint on user_id
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE tablename = 'admin_users'
        AND indexname = 'idx_admin_users_user_unique'
    ) THEN 'PASS: Unique constraint on admin_users.user_id exists'
    ELSE 'FAIL: Unique constraint on admin_users.user_id missing'
  END AS test_admin_unique;

-- Verify is_admin helper function exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc
      WHERE proname = 'is_admin'
    ) THEN 'PASS: is_admin() function exists'
    ELSE 'FAIL: is_admin() function missing'
  END AS test_is_admin_function;


-- ============================================
-- Test 5: RLS Policies Verification
-- Verifies Row Level Security is enabled and policies exist
-- ============================================

-- Verify RLS is enabled on all new tables
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN 'PASS: RLS enabled'
    ELSE 'FAIL: RLS not enabled'
  END AS rls_status
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
WHERE tablename IN ('subscription_tiers', 'user_subscriptions', 'whitelabel_config', 'admin_users')
  AND schemaname = 'public';

-- Count policies per table
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('subscription_tiers', 'user_subscriptions', 'whitelabel_config', 'admin_users')
GROUP BY tablename
ORDER BY tablename;


-- ============================================
-- Summary Query: All Table Structures
-- ============================================

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('subscription_tiers', 'user_subscriptions', 'whitelabel_config', 'admin_users')
ORDER BY table_name, ordinal_position;
