-- ============================================
-- FunnelSim Database Setup
-- ============================================
-- Copy this entire file and paste it into your
-- Supabase Dashboard → SQL Editor → New Query
-- Then click "Run" to execute
-- ============================================

-- ============================================
-- CORE TABLES
-- ============================================

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin(auth.uid()));

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create funnels table
create table if not exists public.funnels (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  traffic_sources jsonb not null default '[]'::jsonb,
  logo_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.funnels enable row level security;

create policy "Users can view own funnels"
  on public.funnels for select
  using (auth.uid() = user_id);

create policy "Users can create own funnels"
  on public.funnels for insert
  with check (auth.uid() = user_id);

create policy "Users can update own funnels"
  on public.funnels for update
  using (auth.uid() = user_id);

create policy "Users can delete own funnels"
  on public.funnels for delete
  using (auth.uid() = user_id);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Function to handle new user registration
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- Trigger for new user profile creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to handle updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for funnels updated_at
drop trigger if exists on_funnels_updated on public.funnels;
create trigger on_funnels_updated
  before update on public.funnels
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- PASSWORD RESET TOKENS
-- ============================================

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text unique not null,
  expires_at timestamp with time zone not null,
  used boolean default false,
  created_at timestamp with time zone default now()
);

create index if not exists idx_password_reset_tokens_token on public.password_reset_tokens(token);
create index if not exists idx_password_reset_tokens_user_id on public.password_reset_tokens(user_id);

alter table public.password_reset_tokens enable row level security;

-- ============================================
-- STORAGE BUCKET FOR LOGOS
-- ============================================

insert into storage.buckets (id, name, public)
values ('funnel-logos', 'funnel-logos', true)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "Anyone can view funnel logos" on storage.objects;
create policy "Anyone can view funnel logos"
on storage.objects for select
using (bucket_id = 'funnel-logos');

drop policy if exists "Users can upload their own funnel logos" on storage.objects;
create policy "Users can upload their own funnel logos"
on storage.objects for insert
with check (
  bucket_id = 'funnel-logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update their own funnel logos" on storage.objects;
create policy "Users can update their own funnel logos"
on storage.objects for update
using (
  bucket_id = 'funnel-logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete their own funnel logos" on storage.objects;
create policy "Users can delete their own funnel logos"
on storage.objects for delete
using (
  bucket_id = 'funnel-logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- SUBSCRIPTION TIERS
-- ============================================

create table if not exists public.subscription_tiers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  stripe_product_id text,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  stripe_price_id_lifetime text,
  price_monthly numeric(10, 2) not null default 0,
  price_yearly numeric(10, 2) not null default 0,
  price_lifetime numeric(10, 2) not null default 0,
  max_funnels integer not null default 1,
  features jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_subscription_tiers_is_active on public.subscription_tiers(is_active);
create index if not exists idx_subscription_tiers_sort_order on public.subscription_tiers(sort_order);

alter table public.subscription_tiers enable row level security;

drop trigger if exists on_subscription_tiers_updated on public.subscription_tiers;
create trigger on_subscription_tiers_updated
  before update on public.subscription_tiers
  for each row execute procedure public.handle_updated_at();

-- Seed default tiers (only if table is empty)
insert into public.subscription_tiers (name, price_monthly, price_yearly, max_funnels, features, sort_order, is_active)
select * from (values
  (
    'Free',
    0::numeric,
    0::numeric,
    3,
    '["Up to 3 funnels", "Basic analytics", "Community support"]'::jsonb,
    1,
    true
  ),
  (
    'Pro',
    29::numeric,
    290::numeric,
    25,
    '["Up to 25 funnels", "Advanced analytics", "Priority support", "Custom branding"]'::jsonb,
    2,
    true
  ),
  (
    'Enterprise',
    99::numeric,
    990::numeric,
    -1,
    '["Unlimited funnels", "Advanced analytics", "Dedicated support", "Custom branding", "API access", "White-label options"]'::jsonb,
    3,
    true
  )
) as t(name, price_monthly, price_yearly, max_funnels, features, sort_order, is_active)
where not exists (select 1 from public.subscription_tiers limit 1);

-- ============================================
-- USER SUBSCRIPTIONS
-- ============================================

create table if not exists public.user_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  tier_id uuid references public.subscription_tiers on delete restrict not null,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text not null default 'active',
  is_lifetime boolean not null default false,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index if not exists idx_user_subscriptions_stripe_subscription_id on public.user_subscriptions(stripe_subscription_id);
create index if not exists idx_user_subscriptions_status on public.user_subscriptions(status);
create unique index if not exists idx_user_subscriptions_user_unique on public.user_subscriptions(user_id);

alter table public.user_subscriptions enable row level security;

drop trigger if exists on_user_subscriptions_updated on public.user_subscriptions;
create trigger on_user_subscriptions_updated
  before update on public.user_subscriptions
  for each row execute procedure public.handle_updated_at();

-- Auto-create free subscription for new users
create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  free_tier_id uuid;
begin
  select id into free_tier_id from public.subscription_tiers where name = 'Free' limit 1;
  if free_tier_id is not null then
    insert into public.user_subscriptions (user_id, tier_id, status)
    values (new.id, free_tier_id, 'active');
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute procedure public.handle_new_user_subscription();

-- ============================================
-- PENDING SUBSCRIPTIONS (for checkout flow)
-- ============================================

create table if not exists public.pending_subscriptions (
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

create index if not exists idx_pending_subscriptions_stripe_session_id on public.pending_subscriptions(stripe_session_id);
create index if not exists idx_pending_subscriptions_customer_email on public.pending_subscriptions(customer_email);
create index if not exists idx_pending_subscriptions_status on public.pending_subscriptions(status);

alter table public.pending_subscriptions enable row level security;

-- ============================================
-- WHITELABEL CONFIG
-- ============================================

create table if not exists public.whitelabel_config (
  id uuid default gen_random_uuid() primary key,
  brand_name text not null default 'FunnelSim',
  tagline text default 'The standard for funnel modeling and simulation',
  primary_color text default '#6366f1',
  logo_light_url text,
  logo_dark_url text,
  favicon_url text,
  hero_headline text default 'Simulate High-Converting Sales Funnels Instantly',
  hero_subheadline text default 'The first visual funnel builder that predicts your profit before you build.',
  hero_badge_text text default 'Early Bird Deal Now Available',
  cta_button_text text default 'Start Modeling Free',
  features jsonb default '[]'::jsonb,
  testimonials jsonb default '[]'::jsonb,
  faq jsonb default '[]'::jsonb,
  footer_text text default 'Built for marketers who demand data over guesswork.',
  email_sender_name text default 'FunnelSim',
  updated_at timestamp with time zone default now()
);

alter table public.whitelabel_config enable row level security;

drop trigger if exists on_whitelabel_config_updated on public.whitelabel_config;
create trigger on_whitelabel_config_updated
  before update on public.whitelabel_config
  for each row execute procedure public.handle_updated_at();

-- Seed default config (only if table is empty)
insert into public.whitelabel_config (brand_name)
select 'FunnelSim'
where not exists (select 1 from public.whitelabel_config limit 1);

-- ============================================
-- ADMIN USERS
-- ============================================

create table if not exists public.admin_users (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  is_admin boolean not null default true,
  created_at timestamp with time zone default now()
);

create unique index if not exists idx_admin_users_user_unique on public.admin_users(user_id);

alter table public.admin_users enable row level security;

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
-- RLS POLICIES
-- ============================================

-- subscription_tiers policies
drop policy if exists "Anyone can view subscription tiers" on public.subscription_tiers;
create policy "Anyone can view subscription tiers"
  on public.subscription_tiers for select
  using (true);

drop policy if exists "Admins can create subscription tiers" on public.subscription_tiers;
create policy "Admins can create subscription tiers"
  on public.subscription_tiers for insert
  with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can update subscription tiers" on public.subscription_tiers;
create policy "Admins can update subscription tiers"
  on public.subscription_tiers for update
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete subscription tiers" on public.subscription_tiers;
create policy "Admins can delete subscription tiers"
  on public.subscription_tiers for delete
  using (public.is_admin(auth.uid()));

-- user_subscriptions policies
drop policy if exists "Users can view own subscription" on public.user_subscriptions;
create policy "Users can view own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can view all subscriptions" on public.user_subscriptions;
create policy "Admins can view all subscriptions"
  on public.user_subscriptions for select
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update subscriptions" on public.user_subscriptions;
create policy "Admins can update subscriptions"
  on public.user_subscriptions for update
  using (public.is_admin(auth.uid()));

-- whitelabel_config policies
drop policy if exists "Anyone can view whitelabel config" on public.whitelabel_config;
create policy "Anyone can view whitelabel config"
  on public.whitelabel_config for select
  using (true);

drop policy if exists "Admins can update whitelabel config" on public.whitelabel_config;
create policy "Admins can update whitelabel config"
  on public.whitelabel_config for update
  using (public.is_admin(auth.uid()));

-- admin_users policies
drop policy if exists "Admins can view admin users" on public.admin_users;
create policy "Admins can view admin users"
  on public.admin_users for select
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can create admin users" on public.admin_users;
create policy "Admins can create admin users"
  on public.admin_users for insert
  with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can update admin users" on public.admin_users;
create policy "Admins can update admin users"
  on public.admin_users for update
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete admin users" on public.admin_users;
create policy "Admins can delete admin users"
  on public.admin_users for delete
  using (public.is_admin(auth.uid()));

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Your database is now configured.
-- Next: Create your first admin user by running
-- the admin SQL command from the setup wizard.
-- ============================================
