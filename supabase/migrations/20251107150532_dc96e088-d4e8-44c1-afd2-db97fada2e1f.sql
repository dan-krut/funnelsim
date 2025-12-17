-- Create storage bucket for funnel logos
insert into storage.buckets (id, name, public)
values ('funnel-logos', 'funnel-logos', true);

-- Add logo_url column to funnels table
alter table public.funnels
add column logo_url text;

-- Create RLS policies for funnel-logos bucket
create policy "Anyone can view funnel logos"
on storage.objects for select
using (bucket_id = 'funnel-logos');

create policy "Users can upload their own funnel logos"
on storage.objects for insert
with check (
  bucket_id = 'funnel-logos' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their own funnel logos"
on storage.objects for update
using (
  bucket_id = 'funnel-logos' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own funnel logos"
on storage.objects for delete
using (
  bucket_id = 'funnel-logos' 
  and auth.uid()::text = (storage.foldername(name))[1]
);