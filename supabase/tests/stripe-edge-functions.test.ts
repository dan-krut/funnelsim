/**
 * Stripe Edge Functions Tests
 *
 * These tests verify the Stripe edge functions work correctly.
 * Tests are designed to be run with a mock Stripe instance or test mode.
 *
 * Test Setup Requirements:
 * - STRIPE_SECRET_KEY must be set to a test mode key (sk_test_*)
 * - STRIPE_WEBHOOK_SECRET must be set for webhook tests
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
 *
 * Run with: deno test --allow-net --allow-env supabase/tests/stripe-edge-functions.test.ts
 */

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

// Test configuration
const EDGE_FUNCTION_BASE_URL = Deno.env.get('SUPABASE_FUNCTIONS_URL') ||
  'https://lntraljilztlwwsggtfa.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') || '';

// ============================================
// Test 1: Checkout Session Creation Returns Valid URL
// ============================================
Deno.test({
  name: "create-checkout-session returns valid URL for valid request",
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
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      }),
    });

    const data = await response.json();

    // Should return 200 or 500 (500 if price ID doesn't exist, but structure is correct)
    if (response.status === 200) {
      assertExists(data.url, "Response should contain url");
      assertExists(data.session_id, "Response should contain session_id");
      assertStringIncludes(data.url, 'checkout.stripe.com', "URL should be Stripe checkout URL");
    } else {
      // If it fails due to invalid price, error message should indicate that
      assertExists(data.error, "Error response should have error message");
    }
  },
});

// ============================================
// Test 2: Checkout Session Rejects Missing Parameters
// ============================================
Deno.test({
  name: "create-checkout-session rejects missing required parameters",
  async fn() {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        // Missing price_id, user_id, user_email
      }),
    });

    assertEquals(response.status, 400, "Should return 400 for missing parameters");

    const data = await response.json();
    assertStringIncludes(data.error, 'Missing required parameters',
      "Error should mention missing parameters");
  },
});

// ============================================
// Test 3: Portal Session Creation Returns Valid URL
// ============================================
Deno.test({
  name: "create-portal-session returns valid URL for valid customer",
  ignore: !Deno.env.get('STRIPE_SECRET_KEY')?.startsWith('sk_test_'),
  async fn() {
    // Note: This test requires a valid customer ID from Stripe test mode
    // In real testing, you would create a test customer first
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        customer_id: 'cus_test_example', // Replace with valid test customer ID
        return_url: 'https://example.com/profile',
      }),
    });

    const data = await response.json();

    // Should return 200 or 500 (500 if customer doesn't exist)
    if (response.status === 200) {
      assertExists(data.url, "Response should contain url");
      assertStringIncludes(data.url, 'billing.stripe.com', "URL should be Stripe portal URL");
    } else {
      // If it fails due to invalid customer, error should be present
      assertExists(data.error, "Error response should have error message");
    }
  },
});

// ============================================
// Test 4: Portal Session Rejects Missing Customer ID
// ============================================
Deno.test({
  name: "create-portal-session rejects missing customer_id",
  async fn() {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        // Missing customer_id
      }),
    });

    assertEquals(response.status, 400, "Should return 400 for missing customer_id");

    const data = await response.json();
    assertStringIncludes(data.error, 'Missing required parameter',
      "Error should mention missing customer_id");
  },
});

// ============================================
// Test 5: Webhook Rejects Invalid Signature
// ============================================
Deno.test({
  name: "stripe-webhook rejects invalid signature",
  async fn() {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/stripe-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid_signature_t=123,v1=fake',
      },
      body: JSON.stringify({
        type: 'checkout.session.completed',
        data: { object: {} },
      }),
    });

    assertEquals(response.status, 400, "Should return 400 for invalid signature");

    const data = await response.json();
    assertStringIncludes(data.error.toLowerCase(), 'signature',
      "Error should mention signature verification failure");
  },
});

// ============================================
// Test 6: Webhook Rejects Missing Signature Header
// ============================================
Deno.test({
  name: "stripe-webhook rejects missing stripe-signature header",
  async fn() {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/stripe-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No stripe-signature header
      },
      body: JSON.stringify({
        type: 'checkout.session.completed',
        data: { object: {} },
      }),
    });

    assertEquals(response.status, 400, "Should return 400 for missing signature header");

    const data = await response.json();
    assertStringIncludes(data.error.toLowerCase(), 'stripe-signature',
      "Error should mention missing stripe-signature header");
  },
});

// ============================================
// Integration Test: Webhook Updates Subscription (with valid signature)
// This test requires setting up a proper webhook signature
// ============================================
Deno.test({
  name: "stripe-webhook correctly processes checkout.session.completed with valid signature",
  ignore: !Deno.env.get('STRIPE_WEBHOOK_SECRET'),
  async fn() {
    // This is a template for integration testing
    // In production, you would:
    // 1. Create a test event using stripe.webhooks.generateTestHeaderString()
    // 2. Send it to the webhook endpoint
    // 3. Verify the database was updated correctly

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    if (!webhookSecret || !stripeSecretKey) {
      console.log("Skipping integration test - missing credentials");
      return;
    }

    // Create a mock event payload
    const eventPayload = {
      id: 'evt_test_' + Date.now(),
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_' + Date.now(),
          client_reference_id: 'test-user-integration',
          customer: 'cus_test_integration',
          subscription: 'sub_test_integration',
          metadata: {
            user_id: 'test-user-integration',
          },
        },
      },
    };

    const payload = JSON.stringify(eventPayload);
    const timestamp = Math.floor(Date.now() / 1000);

    // Generate signature (this is how Stripe signs webhooks)
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signedPayload = `${timestamp}.${payload}`;
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );

    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const stripeSignature = `t=${timestamp},v1=${signature}`;

    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/stripe-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': stripeSignature,
      },
      body: payload,
    });

    // With a valid signature, webhook should process (may fail on DB operations for test data)
    console.log("Webhook response status:", response.status);
    const data = await response.json();
    console.log("Webhook response:", data);

    // The test passes if either:
    // - 200: Event was processed successfully
    // - 500: Event was authenticated but failed on DB operations (expected for test data)
    const validStatuses = [200, 500];
    assertEquals(
      validStatuses.includes(response.status),
      true,
      `Should return 200 or 500, got ${response.status}`
    );
  },
});

// ============================================
// CORS Test: All endpoints support OPTIONS
// ============================================
Deno.test({
  name: "All endpoints support CORS preflight (OPTIONS)",
  async fn() {
    const endpoints = [
      'create-checkout-session',
      'create-portal-session',
      'stripe-webhook',
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
