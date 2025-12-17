-- Create user_subscriptions table
-- Tracks each user's subscription status

create table public.user_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  tier_id uuid references public.subscription_tiers on delete restrict not null,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text not null default 'active',
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for common query patterns
create index idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index idx_user_subscriptions_stripe_subscription_id on public.user_subscriptions(stripe_subscription_id);
create index idx_user_subscriptions_status on public.user_subscriptions(status);

-- Add unique constraint - one subscription per user
create unique index idx_user_subscriptions_user_unique on public.user_subscriptions(user_id);

-- Enable RLS
alter table public.user_subscriptions enable row level security;

-- Trigger for updated_at
create trigger on_user_subscriptions_updated
  before update on public.user_subscriptions
  for each row execute procedure public.handle_updated_at();

-- Create a function to auto-create free subscription for new users
create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  free_tier_id uuid;
begin
  -- Get the Free tier ID
  select id into free_tier_id from public.subscription_tiers where name = 'Free' limit 1;

  -- Create a subscription for the new user with the Free tier
  if free_tier_id is not null then
    insert into public.user_subscriptions (user_id, tier_id, status)
    values (new.id, free_tier_id, 'active');
  end if;

  return new;
end;
$$;

-- Trigger to auto-create subscription when user is created
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute procedure public.handle_new_user_subscription();
