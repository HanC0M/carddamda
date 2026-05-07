create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  feedback_type text not null check (feedback_type in ('bug', 'shop', 'feature', 'other')),
  content text not null check (char_length(content) between 1 and 2000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'done', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create index if not exists user_feedback_status_idx
  on public.user_feedback (status);

create index if not exists user_feedback_type_idx
  on public.user_feedback (feedback_type);

alter table public.user_feedback enable row level security;

-- Carddamda writes this table only through server-side Vercel functions
-- using SUPABASE_SERVICE_ROLE_KEY. Do not expose the service role key in the browser.
