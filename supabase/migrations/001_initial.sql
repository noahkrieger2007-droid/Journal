-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  preferred_language text not null default 'de' check (preferred_language in ('de', 'en')),
  face_id_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- ─────────────────────────────────────────────
-- JOURNAL ENTRIES
-- ─────────────────────────────────────────────
create table if not exists public.journal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  raw_text text not null,
  ai_summary text,
  mood_score smallint check (mood_score between 1 and 10),
  energy_score smallint check (energy_score between 1 and 10),
  highlights text,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'done', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.journal_entries enable row level security;
create policy "Users can manage own entries" on public.journal_entries
  using (auth.uid() = user_id);

create index idx_journal_entries_user_date on public.journal_entries(user_id, date desc);

-- ─────────────────────────────────────────────
-- ENTRY CATEGORIES
-- ─────────────────────────────────────────────
create table if not exists public.entry_categories (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid references public.journal_entries(id) on delete cascade not null,
  category_name text not null check (
    category_name in ('SPORT','SOCIAL','LEARNING','WORK','HEALTH','MINDSET','GOALS','OTHER')
  ),
  duration_minutes integer
);

alter table public.entry_categories enable row level security;
create policy "Users can manage own entry categories" on public.entry_categories
  using (
    exists (
      select 1 from public.journal_entries e
      where e.id = entry_categories.entry_id and e.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- ENTRY PHOTOS
-- ─────────────────────────────────────────────
create table if not exists public.entry_photos (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid references public.journal_entries(id) on delete cascade not null,
  storage_url text not null,
  created_at timestamptz not null default now()
);

alter table public.entry_photos enable row level security;
create policy "Users can manage own entry photos" on public.entry_photos
  using (
    exists (
      select 1 from public.journal_entries e
      where e.id = entry_photos.entry_id and e.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- ACHIEVEMENTS
-- ─────────────────────────────────────────────
create table if not exists public.achievements (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid references public.journal_entries(id) on delete cascade not null,
  description text not null
);

alter table public.achievements enable row level security;
create policy "Users can manage own achievements" on public.achievements
  using (
    exists (
      select 1 from public.journal_entries e
      where e.id = achievements.entry_id and e.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- GOALS
-- ─────────────────────────────────────────────
create table if not exists public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null default 'OTHER',
  deadline date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'COMPLETED', 'PAUSED')),
  progress smallint not null default 0 check (progress between 0 and 100),
  last_mentioned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;
create policy "Users can manage own goals" on public.goals
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- INTENTIONS
-- ─────────────────────────────────────────────
create table if not exists public.intentions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  morning_text text not null,
  evening_comparison text,
  completion_score smallint check (completion_score between 1 and 10),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.intentions enable row level security;
create policy "Users can manage own intentions" on public.intentions
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- MEMORIES (AI memory system)
-- ─────────────────────────────────────────────
create table if not exists public.memories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null check (type in ('FACT', 'EVENT', 'GOAL', 'HABIT', 'INSIGHT')),
  content text not null,
  importance smallint not null default 5 check (importance between 1 and 10),
  source_entry_id uuid references public.journal_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  last_referenced_at timestamptz not null default now()
);

alter table public.memories enable row level security;
create policy "Users can manage own memories" on public.memories
  using (auth.uid() = user_id);

create index idx_memories_user_importance on public.memories(user_id, importance desc);

-- ─────────────────────────────────────────────
-- STORAGE BUCKET
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('entry-photos', 'entry-photos', true)
on conflict (id) do nothing;

create policy "Users can upload own photos" on storage.objects
  for insert with check (
    bucket_id = 'entry-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view own photos" on storage.objects
  for select using (
    bucket_id = 'entry-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own photos" on storage.objects
  for delete using (
    bucket_id = 'entry-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );
