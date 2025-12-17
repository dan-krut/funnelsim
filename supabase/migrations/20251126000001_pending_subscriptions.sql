-- Create pending_subscriptions table
-- Tracks purchases awaiting account creation for the reverse checkout flow
-- When users complete Stripe checkout before creating an account, their
-- subscription details are stored here until they complete registration

create table public.pending_subscriptions (
  id uuid default gen_random_uuid() primary key,
  stripe_customer_id text not null,
  stripe_session_id text unique not null,
  stripe_subscription_id text,
  tier_id uuid references public.subscription_tiers(id) on delete restrict,
  customer_email text not null,
  status text not null default 'pending',
  created_at timestamp with time zone default now(),
  linked_user_id uuid references auth.users(id) on delete set null,
  linked_at timestamp with time zone,
  expires_at timestamp with time zone default (now() + interval '7 days')
);

-- Create indexes for common query patterns
create index idx_pending_subscriptions_stripe_session_id on public.pending_subscriptions(stripe_session_id);
create index idx_pending_subscriptions_customer_email on public.pending_subscriptions(customer_email);
create index idx_pending_subscriptions_status on public.pending_subscriptions(status);
create index idx_pending_subscriptions_expires_at on public.pending_subscriptions(expires_at);

-- Enable RLS
alter table public.pending_subscriptions enable row level security;

-- RLS Policies for pending_subscriptions
-- Service role has full access (bypasses RLS by default in Supabase)
-- No direct user access needed - all operations go through edge functions

-- Policy to allow service role full access for edge functions
-- Note: In Supabase, service_role bypasses RLS by default, but we add
-- explicit policies for clarity and to handle any edge cases

-- Service role can select all pending subscriptions
create policy "Service role can select pending_subscriptions"
  on public.pending_subscriptions for select
  to service_role
  using (true);

-- Service role can insert pending subscriptions
create policy "Service role can insert pending_subscriptions"
  on public.pending_subscriptions for insert
  to service_role
  with check (true);

-- Service role can update pending subscriptions
create policy "Service role can update pending_subscriptions"
  on public.pending_subscriptions for update
  to service_role
  using (true);

-- Service role can delete pending subscriptions
create policy "Service role can delete pending_subscriptions"
  on public.pending_subscriptions for delete
  to service_role
  using (true);

-- Add comment on table for documentation
comment on table public.pending_subscriptions is 'Tracks Stripe subscriptions purchased before account creation. Records are linked to users upon registration or expire after 7 days.';
comment on column public.pending_subscriptions.status is 'Status of the pending subscription: pending (awaiting account creation) or linked (associated with a user account)';
comment on column public.pending_subscriptions.expires_at is 'Expiration timestamp for cleanup of unclaimed subscriptions (default: 7 days from creation)';
