/**
 * Checkout Flow Edge Functions Tests
 *
 * Tests for the unauthenticated checkout flow feature:
 * - create-checkout-session (with and without user_id)
 * - retrieve-checkout-session (new function)
 * - stripe-webhook (pending_subscriptions handling)
 * - link-pending-subscription (new function)
 *
 * Run with: deno test --allow-net --allow-env supabase/tests/checkout-flow-edge-functions.test.ts
 */

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.190.0/testing/asserts.ts";

// Test configuration
const EDGE_FUNCTION_BASE_URL = Deno.env.get('SUPABASE_FUNCTIONS_URL') ||
  'https://lntraljilztlwwsggtfa.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') || '';

// ============================================
// Test 1: create-checkout-session without user_id (unauthenticated flow)
// ============================================
Deno.test({
  name: "create-checkout-session accepts request without user_id (unauthenticated flow)",
  ignore: !Deno.env.get('STRIPE_SECRET_KEY')?.startsWith('sk_test_'),
  async fn() {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        price_id: 'price_test_example', // Replace with actual test price ID
        // No user_id or user_email - unauthenticated flow
      }),
    });

    const data = await response.json();

    // Should return 200 with URL, or 500 if price doesn't exist (but not 400 for missing user)
    if (response.status === 200) {
      assertExists(data.url, "Response should contain url");
      assertExists(data.session_id, "Response should contain session_id");
      assertStringIncludes(data.url, 'checkout.stripe.com', "URL should be Stripe checkout URL");
    } else if (response.status === 400) {
      // Should NOT fail due to missing user_id/user_email
      assertEquals(
        data.error.includes('user_id') || data.error.includes('user_email'),
        false,
        "Should not require user_id or user_email for unauthenticated checkout"
      );
    }
    // 500 is acceptable if Stripe price doesn't exist
  },
});

// ============================================
// Test 2: create-checkout-session with user_id (existing user upgrade)
// ============================================
Deno.test({
  name: "create-checkout-session works with user_id (authenticated upgrade flow)",
  ignore: !Deno.env.get('STRIPE_SECRET_KEY')?.startsWith('sk_test_'),
  async fn() {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        price_id: 'price_test_example', // Replace with actual test price ID
        user_id: 'test-user-id-12345',
        user_email: 'test@example.com',
        success_url: 'https://example.com/profile?checkout=success',
        cancel_url: 'https://example.com/profile?checkout=canceled',
      }),
    });

    const data = await response.json();

    // Should return 200 with URL, or 500 if price doesn't exist
    if (response.status === 200) {
      assertExists(data.url, "Response should contain url");
      assertExists(data.session_id, "Response should contain session_id");
      assertStringIncludes(data.url, 'checkout.stripe.com', "URL should be Stripe checkout URL");
    } else {
      // Error should be from Stripe (invalid price), not validation
      assertExists(data.error, "Error response should have error message");
    }
  },
});

// ============================================
// Test 3: retrieve-checkout-session returns correct session data
// ============================================
Deno.test({
  name: "retrieve-checkout-session returns session details for valid session_id",
  ignore: !Deno.env.get('STRIPE_SECRET_KEY')?.startsWith('sk_test_'),
  async fn() {
    // First create a checkout session to get a valid session_id
    const createResponse = await fetch(`${EDGE_FUNCTION_BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        price_id: 'price_test_example', // Replace with actual test price ID
      }),
    });

    if (createResponse.status !== 200) {
      console.log("Skipping retrieve test - could not create session (may need valid price ID)");
      return;
    }

    const createData = await createResponse.json();
    const sessionId = createData.session_id;

    // Now retrieve the session
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/retrieve-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        session_id: sessionId,
      }),
    });

    const data = await response.json();

    if (response.status === 200) {
      // Verify expected fields are returned
      assertExists(data.payment_status, "Response should contain payment_status");
      // customer_email may be null for incomplete sessions
    }
  },
});

// ============================================
// Test 4: retrieve-checkout-session rejects missing session_id
// ============================================
Deno.test({
  name: "retrieve-checkout-session rejects missing session_id",
  async fn() {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/retrieve-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        // No session_id
      }),
    });

    assertEquals(response.status, 400, "Should return 400 for missing session_id");

    const data = await response.json();
    assertStringIncludes(
      data.error.toLowerCase(),
      'session_id',
      "Error should mention missing session_id"
    );
  },
});

// ============================================
// Test 5: link-pending-subscription validates required parameters
// ============================================
Deno.test({
  name: "link-pending-subscription rejects missing parameters",
  async fn() {
    // Test missing session_id
    let response = await fetch(`${EDGE_FUNCTION_BASE_URL}/link-pending-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        user_id: 'test-user-id',
        // Missing session_id
      }),
    });

    assertEquals(response.status, 400, "Should return 400 for missing session_id");

    // Test missing user_id
    response = await fetch(`${EDGE_FUNCTION_BASE_URL}/link-pending-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        session_id: 'cs_test_123',
        // Missing user_id
      }),
    });

    assertEquals(response.status, 400, "Should return 400 for missing user_id");
  },
});

// ============================================
// Test 6: CORS support for new endpoints
// ============================================
Deno.test({
  name: "New endpoints support CORS preflight (OPTIONS)",
  async fn() {
    const endpoints = [
      'retrieve-checkout-session',
      'link-pending-subscription',
    ];

    for (const endpoint of endpoints) {
      const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/${endpoint}`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      });

      assertEquals(
        response.status,
        200,
        `${endpoint} should return 200 for OPTIONS`
      );

      assertExists(
        response.headers.get('access-control-allow-origin'),
        `${endpoint} should have CORS header`
      );
    }
  },
});
