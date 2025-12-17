-- RLS Policies for subscription and whitelabel tables

-- Helper function to check if user is admin
create or replace function public.is_admin(check_user_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  return exists (
    select 1 from public.admin_users
    where user_id = check_user_id and is_admin = true
  );
end;
$$;

-- ============================================
-- subscription_tiers policies
-- ============================================

-- Public read access - anyone can view subscription tiers
create policy "Anyone can view subscription tiers"
  on public.subscription_tiers for select
  using (true);

-- Admin-only insert
create policy "Admins can create subscription tiers"
  on public.subscription_tiers for insert
  with check (public.is_admin(auth.uid()));

-- Admin-only update
create policy "Admins can update subscription tiers"
  on public.subscription_tiers for update
  using (public.is_admin(auth.uid()));

-- Admin-only delete
create policy "Admins can delete subscription tiers"
  on public.subscription_tiers for delete
  using (public.is_admin(auth.uid()));

-- ============================================
-- user_subscriptions policies
-- ============================================

-- Users can read their own subscription
create policy "Users can view own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

-- Admins can view all subscriptions
create policy "Admins can view all subscriptions"
  on public.user_subscriptions for select
  using (public.is_admin(auth.uid()));

-- Service role handles inserts via webhooks/triggers (no user policy needed for insert)
-- The trigger uses security definer, bypassing RLS

-- Service role handles updates via webhooks (no user policy needed for update)
-- Admins can update any subscription
create policy "Admins can update subscriptions"
  on public.user_subscriptions for update
  using (public.is_admin(auth.uid()));

-- ============================================
-- whitelabel_config policies
-- ============================================

-- Public read access - anyone can view whitelabel config
create policy "Anyone can view whitelabel config"
  on public.whitelabel_config for select
  using (true);

-- Admin-only update (no insert since single-row constraint)
create policy "Admins can update whitelabel config"
  on public.whitelabel_config for update
  using (public.is_admin(auth.uid()));

-- ============================================
-- admin_users policies
-- ============================================

-- Admins can view admin users
create policy "Admins can view admin users"
  on public.admin_users for select
  using (public.is_admin(auth.uid()));

-- Admins can create admin users
create policy "Admins can create admin users"
  on public.admin_users for insert
  with check (public.is_admin(auth.uid()));

-- Admins can update admin users
create policy "Admins can update admin users"
  on public.admin_users for update
  using (public.is_admin(auth.uid()));

-- Admins can delete admin users (but not themselves - handled in app logic)
create policy "Admins can delete admin users"
  on public.admin_users for delete
  using (public.is_admin(auth.uid()));
