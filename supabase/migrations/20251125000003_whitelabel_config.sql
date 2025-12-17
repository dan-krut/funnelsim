-- Create whitelabel_config table
-- Single-row table for deployment configuration

create table public.whitelabel_config (
  id uuid default gen_random_uuid() primary key,
  brand_name text not null default 'FunnelSim',
  tagline text default 'The standard for funnel modeling and simulation',
  primary_color text default '#6366f1',
  logo_light_url text,
  logo_dark_url text,
  favicon_url text,
  hero_headline text default 'Simulate High-Converting Sales Funnels Instantly',
  hero_subheadline text default 'The first visual funnel builder that predicts your profit before you build. Map out flows, calculate conversions, and optimize ROI in real-time.',
  hero_badge_text text default 'Early Bird Deal Now Available',
  cta_button_text text default 'Start Modeling Free',
  features jsonb default '[
    {"title": "Visual Flow Builder", "description": "Drag, drop, and connect nodes. Build complex multi-step funnels in seconds with our intuitive React Flow interface.", "icon": "MousePointer2"},
    {"title": "Real-Time ROI Calc", "description": "Input traffic costs and conversion rates. Watch profit margins and EPC calculate instantly as you tweak numbers.", "icon": "Calculator"},
    {"title": "Smart Logic Nodes", "description": "Specialized nodes for OTOs (One-Time Offers), Downsells, and Order Bumps with automatic branching logic.", "icon": "Zap"},
    {"title": "Cloud Persistence", "description": "Auto-saving to the cloud. Never lose your work. Access your funnels from any device, anywhere, securely.", "icon": "Cloud"},
    {"title": "Client-Ready Exports", "description": "Generate professional PDF reports or high-res PNGs to impress clients and stakeholders.", "icon": "Share2"},
    {"title": "Proven Templates", "description": "Don''t start from blank. Load high-converting funnel structures for webinars, lead magnets, and high-ticket offers.", "icon": "Layout"}
  ]'::jsonb,
  testimonials jsonb default '[
    {"quote": "I used to spend hours in Excel trying to model upsell flows. FunnelSim lets me do it in 5 minutes during a client call. It closes deals.", "author": "Sarah Jenkins", "role": "Agency Owner", "image": "https://i.pravatar.cc/150?u=sarah"},
    {"quote": "The ability to instantly see how a 1% conversion bump affects total profit is a game changer. My media buyers live in this tool now.", "author": "Marcus Chen", "role": "Head of Growth", "image": "https://i.pravatar.cc/150?u=marcus"},
    {"quote": "Finally, a tool that speaks the language of funnel hackers. The visual canvas is exactly what I needed to plan my next launch.", "author": "Elena Rodriguez", "role": "Course Creator", "image": "https://i.pravatar.cc/150?u=elena"}
  ]'::jsonb,
  faq jsonb default '[
    {"question": "What is FunnelSim?", "answer": "FunnelSim is a powerful visual tool that allows you to design, simulate, and optimize your marketing funnels. You can map out customer journeys, set conversion rates, and simulate traffic flow to predict revenue and identify bottlenecks before you spend a dime on ads."},
    {"question": "Can I export my funnel designs?", "answer": "Yes! You can export your funnel designs as high-quality images (PNG/JPG) or as PDF reports to share with your team or clients. We also support exporting data in CSV format for further analysis."},
    {"question": "How accurate are the simulations?", "answer": "Our simulation engine uses advanced statistical models to provide realistic projections based on the conversion rates and traffic data you input. While no simulation can predict the future 100%, FunnelSim gives you a statistically significant range of probable outcomes to help you make informed decisions."},
    {"question": "Is there a free trial available?", "answer": "Yes, we offer a 14-day free trial on all our plans. You can explore all features, build unlimited funnels, and run simulations to see if FunnelSim is the right fit for your business. No credit card required to start."},
    {"question": "Can I simulate different traffic sources?", "answer": "Absolutely. You can define multiple traffic sources (e.g., Facebook Ads, Organic Search, Email) with different costs and conversion characteristics to see how they impact your overall funnel performance and ROI."}
  ]'::jsonb,
  footer_text text default 'The standard for funnel modeling and simulation. Built for marketers who demand data over guesswork.',
  email_sender_name text default 'FunnelSim',
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.whitelabel_config enable row level security;

-- Trigger for updated_at
create trigger on_whitelabel_config_updated
  before update on public.whitelabel_config
  for each row execute procedure public.handle_updated_at();

-- Create function to enforce single-row constraint
create or replace function public.enforce_single_whitelabel_config()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.whitelabel_config) >= 1 then
    raise exception 'Only one whitelabel_config row is allowed. Use UPDATE instead of INSERT.';
  end if;
  return new;
end;
$$;

-- Trigger to enforce single-row constraint on insert
create trigger enforce_single_whitelabel_config_trigger
  before insert on public.whitelabel_config
  for each row execute procedure public.enforce_single_whitelabel_config();

-- Seed default configuration
insert into public.whitelabel_config (brand_name) values ('FunnelSim');
