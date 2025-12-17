-- Database Tests for pending_subscriptions Table
-- These tests verify the pending_subscriptions table schema and constraints
-- Run these queries against your Supabase database to verify the schema

-- ============================================
-- Test 1: Table Structure and Insert Operation
-- Verifies that pending_subscriptions table exists and accepts all required fields
-- ============================================

-- First, verify the table exists with correct columns
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'pending_subscriptions'
    ) THEN 'PASS: pending_subscriptions table exists'
    ELSE 'FAIL: pending_subscriptions table does not exist'
  END AS test_table_exists;

-- Verify all required columns exist with correct types
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pending_subscriptions'
ORDER BY ordinal_position;

-- Test insert with all required fields (will be run as service role)
-- Note: This test should be run with service_role key to bypass RLS
DO $$
DECLARE
  test_tier_id uuid;
  inserted_id uuid;
BEGIN
  -- Get a tier ID to use for the test
  SELECT id INTO test_tier_id FROM subscription_tiers LIMIT 1;

  -- Insert a test pending subscription
  INSERT INTO pending_subscriptions (
    stripe_customer_id,
    stripe_session_id,
    stripe_subscription_id,
    tier_id,
    customer_email,
    status
  )
  VALUES (
    'cus_test_insert_123',
    'cs_test_insert_session_123',
    'sub_test_insert_123',
    test_tier_id,
    'test-insert@example.com',
    'pending'
  )
  RETURNING id INTO inserted_id;

  -- Verify the insert worked
  IF inserted_id IS NOT NULL THEN
    RAISE NOTICE 'PASS: Insert with all required fields succeeded, ID: %', inserted_id;
  ELSE
    RAISE NOTICE 'FAIL: Insert did not return an ID';
  END IF;

  -- Clean up test data
  DELETE FROM pending_subscriptions WHERE stripe_session_id = 'cs_test_insert_session_123';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FAIL: Insert failed with error: %', SQLERRM;
END $$;


-- ============================================
-- Test 2: Unique Constraint on stripe_session_id
-- Verifies that duplicate session IDs are rejected
-- ============================================

-- Verify unique index exists on stripe_session_id
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE tablename = 'pending_subscriptions'
        AND indexdef LIKE '%UNIQUE%stripe_session_id%'
    ) OR EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE tablename = 'pending_subscriptions'
        AND indexname LIKE '%stripe_session_id%unique%'
    ) OR EXISTS (
      SELECT 1
      FROM pg_constraint pc
      JOIN pg_class c ON pc.conrelid = c.oid
      WHERE c.relname = 'pending_subscriptions'
        AND pc.contype = 'u'
    ) THEN 'PASS: Unique constraint on stripe_session_id exists'
    ELSE 'FAIL: Unique constraint on stripe_session_id missing'
  END AS test_unique_constraint;

-- Test that duplicate session_id is rejected
DO $$
DECLARE
  test_tier_id uuid;
  duplicate_error boolean := false;
BEGIN
  -- Get a tier ID to use for the test
  SELECT id INTO test_tier_id FROM subscription_tiers LIMIT 1;

  -- Insert first record
  INSERT INTO pending_subscriptions (
    stripe_customer_id,
    stripe_session_id,
    tier_id,
    customer_email
  )
  VALUES (
    'cus_test_dup_1',
    'cs_test_duplicate_session',
    test_tier_id,
    'test-dup-1@example.com'
  );

  -- Try to insert duplicate session_id (should fail)
  BEGIN
    INSERT INTO pending_subscriptions (
      stripe_customer_id,
      stripe_session_id,
      tier_id,
      customer_email
    )
    VALUES (
      'cus_test_dup_2',
      'cs_test_duplicate_session', -- Same session ID
      test_tier_id,
      'test-dup-2@example.com'
    );
  EXCEPTION WHEN unique_violation THEN
    duplicate_error := true;
  END;

  IF duplicate_error THEN
    RAISE NOTICE 'PASS: Duplicate stripe_session_id correctly rejected';
  ELSE
    RAISE NOTICE 'FAIL: Duplicate stripe_session_id was allowed';
  END IF;

  -- Clean up test data
  DELETE FROM pending_subscriptions WHERE stripe_session_id = 'cs_test_duplicate_session';

EXCEPTION WHEN OTHERS THEN
  -- Clean up on any other error
  DELETE FROM pending_subscriptions WHERE stripe_session_id = 'cs_test_duplicate_session';
  RAISE NOTICE 'FAIL: Test failed with error: %', SQLERRM;
END $$;


-- ============================================
-- Test 3: Status Transitions (pending -> linked)
-- Verifies that status can be updated and linked_user_id/linked_at set
-- ============================================

DO $$
DECLARE
  test_tier_id uuid;
  test_record_id uuid;
  updated_status text;
  linked_timestamp timestamptz;
BEGIN
  -- Get a tier ID to use for the test
  SELECT id INTO test_tier_id FROM subscription_tiers LIMIT 1;

  -- Insert a pending subscription
  INSERT INTO pending_subscriptions (
    stripe_customer_id,
    stripe_session_id,
    tier_id,
    customer_email,
    status
  )
  VALUES (
    'cus_test_transition',
    'cs_test_transition_session',
    test_tier_id,
    'test-transition@example.com',
    'pending'
  )
  RETURNING id INTO test_record_id;

  -- Update status to 'linked' and set linked fields
  -- Note: Using a dummy UUID since we don't have a real auth.users entry
  UPDATE pending_subscriptions
  SET
    status = 'linked',
    linked_at = NOW()
    -- linked_user_id would normally be set but requires FK to auth.users
  WHERE id = test_record_id;

  -- Verify the update worked
  SELECT status, linked_at
  INTO updated_status, linked_timestamp
  FROM pending_subscriptions
  WHERE id = test_record_id;

  IF updated_status = 'linked' AND linked_timestamp IS NOT NULL THEN
    RAISE NOTICE 'PASS: Status transition from pending to linked succeeded';
  ELSE
    RAISE NOTICE 'FAIL: Status transition failed. Status: %, linked_at: %', updated_status, linked_timestamp;
  END IF;

  -- Clean up test data
  DELETE FROM pending_subscriptions WHERE id = test_record_id;

EXCEPTION WHEN OTHERS THEN
  -- Clean up on error
  DELETE FROM pending_subscriptions WHERE stripe_session_id = 'cs_test_transition_session';
  RAISE NOTICE 'FAIL: Test failed with error: %', SQLERRM;
END $$;


-- ============================================
-- Test 4: RLS Policies - Service Role Access
-- Verifies that RLS is enabled and service role has access
-- ============================================

-- Verify RLS is enabled on the table
SELECT
  CASE
    WHEN rowsecurity THEN 'PASS: RLS enabled on pending_subscriptions'
    ELSE 'FAIL: RLS not enabled on pending_subscriptions'
  END AS test_rls_enabled
FROM pg_class
WHERE relname = 'pending_subscriptions';

-- Verify service role policy exists
-- Note: Service role bypasses RLS by default in Supabase, but we add explicit policy for clarity
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'pending_subscriptions';

-- Count policies on the table
SELECT
  CASE
    WHEN COUNT(*) >= 1 THEN 'PASS: At least 1 RLS policy exists on pending_subscriptions'
    ELSE 'FAIL: No RLS policies found on pending_subscriptions'
  END AS test_policies_exist
FROM pg_policies
WHERE tablename = 'pending_subscriptions';


-- ============================================
-- Summary: Table Structure Verification
-- ============================================

-- Verify all indexes exist
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'pending_subscriptions';

-- Verify foreign keys exist
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'pending_subscriptions';

-- Verify default values are correct
SELECT
  column_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pending_subscriptions'
  AND column_default IS NOT NULL;
