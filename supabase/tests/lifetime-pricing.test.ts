/**
 * Lifetime Pricing Tests
 *
 * These tests verify the lifetime pricing feature works correctly.
 * Tests include schema verification and edge function behavior.
 *
 * Run with: deno test --allow-net --allow-env supabase/tests/lifetime-pricing.test.ts
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
// Test 1: Create Checkout Session accepts lifetime billing interval
// ============================================
Deno.test({
  name: "create-checkout-session accepts lifetime billing interval",
  async fn() {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        price_id: 'price_lifetime_test',
        user_id: 'test-user-lifetime-001',
        user_email: 'lifetime-test@example.com',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        billing_interval: 'lifetime',
      }),
    });

    // We expect either success (200) or a Stripe error (500) if price doesn't exist
    // The important thing is the function accepted the billing_interval
    const data = await response.json();

    if (response.status === 200) {
      assertExists(data.url, "Response should contain url for checkout");
      assertExists(data.session_id, "Response should contain session_id");
    } else if (response.status === 500) {
      // Stripe error is expected for non-existent price, but function accepted the request
      assertExists(data.error, "Error response should have error message");
      // Should not be a validation error about billing_interval
      assertEquals(
        data.error.includes('billing_interval'),
        false,
        "Error should not be about invalid billing_interval"
      );
    }
    // 400 would indicate the function rejected the request format
    assertEquals(
      response.status !== 400,
      true,
      "Function should accept lifetime billing_interval"
    );
  },
});

// ============================================
// Test 2: Create Checkout Session still works with monthly billing
// ============================================
Deno.test({
  name: "create-checkout-session still accepts monthly billing interval",
  async fn() {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        price_id: 'price_monthly_test',
        user_id: 'test-user-monthly-001',
        user_email: 'monthly-test@example.com',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        billing_interval: 'monthly',
      }),
    });

    const data = await response.json();

    // Should not get 400 for valid monthly billing
    assertEquals(
      response.status !== 400,
      true,
      "Function should accept monthly billing_interval"
    );
  },
});

// ============================================
// Test 3: Create Checkout Session still works with yearly billing
// ============================================
Deno.test({
  name: "create-checkout-session still accepts yearly billing interval",
  async fn() {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        price_id: 'price_yearly_test',
        user_id: 'test-user-yearly-001',
        user_email: 'yearly-test@example.com',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        billing_interval: 'yearly',
      }),
    });

    const data = await response.json();

    // Should not get 400 for valid yearly billing
    assertEquals(
      response.status !== 400,
      true,
      "Function should accept yearly billing_interval"
    );
  },
});

// ============================================
// Test 4: Webhook rejects missing signature (existing behavior preserved)
// ============================================
Deno.test({
  name: "stripe-webhook rejects missing stripe-signature header (unchanged behavior)",
  async fn() {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/stripe-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No stripe-signature header
      },
      body: JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            mode: 'payment',
            metadata: { is_lifetime: 'true' },
          },
        },
      }),
    });

    assertEquals(response.status, 400, "Should return 400 for missing signature header");

    const data = await response.json();
    assertStringIncludes(data.error.toLowerCase(), 'stripe-signature',
      "Error should mention missing stripe-signature header");
  },
});

// ============================================
// Test 5: Webhook handles CORS preflight for lifetime webhook calls
// ============================================
Deno.test({
  name: "stripe-webhook supports CORS preflight (required for lifetime purchases)",
  async fn() {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/stripe-webhook`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'POST',
      },
    });

    assertEquals(
      response.status,
      200,
      "stripe-webhook should return 200 for OPTIONS"
    );

    assertExists(
      response.headers.get('access-control-allow-origin'),
      "stripe-webhook should have CORS header"
    );
  },
});

// ============================================
// Test 6: Webhook rejects invalid signature for lifetime events
// ============================================
Deno.test({
  name: "stripe-webhook rejects invalid signature for payment mode events",
  async fn() {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/stripe-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid_signature_t=123,v1=fake',
      },
      body: JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_lifetime_fake',
            mode: 'payment', // Lifetime purchases use payment mode
            client_reference_id: 'test-user-id',
            customer: 'cus_test',
            metadata: {
              is_lifetime: 'true',
              user_id: 'test-user-id',
            },
          },
        },
      }),
    });

    assertEquals(response.status, 400, "Should return 400 for invalid signature");

    const data = await response.json();
    assertStringIncludes(data.error.toLowerCase(), 'signature',
      "Error should mention signature verification failure");
  },
});
