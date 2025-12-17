-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create funnels table
create table public.funnels (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  traffic_sources jsonb not null default '[]'::jsonb,
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

-- Trigger for profiles
create function public.handle_new_user()
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger for updated_at on funnels
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_funnels_updated
  before update on public.funnels
  for each row execute procedure public.handle_updated_at();