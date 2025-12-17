-- Create subscription_tiers table
-- Stores available subscription plans (Free, Pro, Enterprise)

create table public.subscription_tiers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  stripe_product_id text,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  price_monthly numeric(10, 2) not null default 0,
  price_yearly numeric(10, 2) not null default 0,
  max_funnels integer not null default 1,
  features jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for common query patterns
create index idx_subscription_tiers_is_active on public.subscription_tiers(is_active);
create index idx_subscription_tiers_sort_order on public.subscription_tiers(sort_order);

-- Enable RLS
alter table public.subscription_tiers enable row level security;

-- Trigger for updated_at
create trigger on_subscription_tiers_updated
  before update on public.subscription_tiers
  for each row execute procedure public.handle_updated_at();

-- Seed default tiers
insert into public.subscription_tiers (name, price_monthly, price_yearly, max_funnels, features, sort_order, is_active)
values
  (
    'Free',
    0,
    0,
    3,
    '["Up to 3 funnels", "Basic analytics", "Community support"]'::jsonb,
    1,
    true
  ),
  (
    'Pro',
    29,
    290,
    25,
    '["Up to 25 funnels", "Advanced analytics", "Priority support", "Custom branding"]'::jsonb,
    2,
    true
  ),
  (
    'Enterprise',
    99,
    990,
    -1,
    '["Unlimited funnels", "Advanced analytics", "Dedicated support", "Custom branding", "API access", "White-label options"]'::jsonb,
    3,
    true
  );
