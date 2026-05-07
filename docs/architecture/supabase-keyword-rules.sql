create table if not exists public.keyword_rule_suggestions (
  id uuid primary key default gen_random_uuid(),
  source_keyword text not null,
  target_keyword text not null,
  normalized_source text not null,
  normalized_target text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'disabled')),
  reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create unique index if not exists keyword_rule_suggestions_normalized_pair_idx
  on public.keyword_rule_suggestions (normalized_source, normalized_target);

create index if not exists keyword_rule_suggestions_status_idx
  on public.keyword_rule_suggestions (status);

alter table public.keyword_rule_suggestions enable row level security;

-- Carddamda reads/writes this table only through server-side Vercel functions
-- using SUPABASE_SERVICE_ROLE_KEY. Do not expose the service role key in the browser.
