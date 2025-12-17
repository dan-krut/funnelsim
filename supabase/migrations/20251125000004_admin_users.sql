-- Create admin_users table
-- Tracks which users have admin access

create table public.admin_users (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  is_admin boolean not null default true,
  created_at timestamp with time zone default now()
);

-- Add unique constraint - one entry per user
create unique index idx_admin_users_user_unique on public.admin_users(user_id);

-- Enable RLS
alter table public.admin_users enable row level security;
