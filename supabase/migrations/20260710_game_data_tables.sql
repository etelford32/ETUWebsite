-- Full game-data schema build-out.
--
-- Creates the tables the app code has always referenced but that were never
-- provisioned on this project: player_scores, feedback (+ votes,
-- notifications), backlog_items (+ votes), ship_designs, devlog_entries,
-- career_applications, investor_inquiries, plus player-stat columns on
-- profiles.
--
-- Consolidated from the repo's per-feature migration files, with two
-- deliberate changes:
--   1. player_scores.mode allows 'megabot' (the web mini-game mode the
--      submit-score route accepts; the original CHECK omitted it).
--   2. Admin RLS uses the real profiles.role ('admin'/'staff') instead of
--      the authored "any authenticated user" placeholder policies.
-- The app's server routes use the service-role key (RLS-exempt); these
-- policies are defense-in-depth for any direct client access.

create extension if not exists "uuid-ossp";

-- Shared updated_at trigger fn (idempotent).
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Is the current auth user staff/admin? SECURITY DEFINER so the policy can
-- read profiles.role without recursing through profiles' own RLS.
create or replace function public.current_user_is_staff()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  );
$$ language sql security definer stable;

-- ─────────────────────────────────────────────────────────────────────────
-- player_scores
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.player_scores (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  score         integer not null check (score >= 0),
  mode          text not null check (mode in ('speedrun','survival','discovery','boss_rush','megabot','global')),
  platform      text not null check (platform in ('PC','Mac','Linux','PS','Xbox','Switch')),
  level         integer default 1 check (level > 0),
  time_seconds  integer check (time_seconds >= 0),
  submitted_at  timestamptz default timezone('utc', now()) not null,
  is_verified   boolean default false not null,
  metadata      jsonb default '{}'::jsonb
);
create index if not exists idx_scores_user_id on public.player_scores(user_id);
create index if not exists idx_scores_submitted_at on public.player_scores(submitted_at desc);
create index if not exists idx_scores_score on public.player_scores(score desc);
create index if not exists idx_scores_mode on public.player_scores(mode);
create index if not exists idx_scores_verified on public.player_scores(is_verified) where is_verified = true;

alter table public.player_scores enable row level security;
drop policy if exists "Verified scores are public" on public.player_scores;
create policy "Verified scores are public" on public.player_scores
  for select using (is_verified = true);
drop policy if exists "Users can view their own scores" on public.player_scores;
create policy "Users can view their own scores" on public.player_scores
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their own scores" on public.player_scores;
create policy "Users can insert their own scores" on public.player_scores
  for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- profiles player-stat columns
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists level          integer default 1 not null,
  add column if not exists xp             integer default 0 not null,
  add column if not exists total_kills    integer default 0 not null,
  add column if not exists total_deaths   integer default 0 not null,
  add column if not exists total_wins     integer default 0 not null,
  add column if not exists total_losses   integer default 0 not null,
  add column if not exists total_playtime integer default 0 not null,
  add column if not exists highest_score  integer default 0 not null,
  add column if not exists ship_class     text;
create index if not exists idx_profiles_highest_score on public.profiles(highest_score desc);

-- ─────────────────────────────────────────────────────────────────────────
-- feedback (+ votes, notifications)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.feedback (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete set null,
  type         text not null check (type in ('bug','feature','suggestion','support','other')),
  title        text not null check (char_length(title) between 3 and 200),
  description  text not null check (char_length(description) >= 10),
  status       text not null default 'open' check (status in ('open','in_progress','resolved','closed','duplicate')),
  priority     text not null default 'medium' check (priority in ('low','medium','high','critical')),
  source       text not null default 'web' check (source in ('web','game')),
  email        text,
  vote_count   integer default 0 not null,
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz default timezone('utc', now()) not null,
  updated_at   timestamptz default timezone('utc', now()) not null,
  resolved_at  timestamptz
);
create index if not exists idx_feedback_user_id on public.feedback(user_id);
create index if not exists idx_feedback_type on public.feedback(type);
create index if not exists idx_feedback_status on public.feedback(status);
create index if not exists idx_feedback_created_at on public.feedback(created_at desc);
create index if not exists idx_feedback_vote_count on public.feedback(vote_count desc);

alter table public.feedback enable row level security;
drop policy if exists "Anyone can submit feedback" on public.feedback;
create policy "Anyone can submit feedback" on public.feedback
  for insert with check (true);
drop policy if exists "Own or admin can view feedback" on public.feedback;
create policy "Own or admin can view feedback" on public.feedback
  for select using (auth.uid() = user_id or public.current_user_is_staff());
drop policy if exists "Own or admin can update feedback" on public.feedback;
create policy "Own or admin can update feedback" on public.feedback
  for update using (auth.uid() = user_id or public.current_user_is_staff());

drop trigger if exists on_feedback_updated on public.feedback;
create trigger on_feedback_updated
  before update on public.feedback
  for each row execute function public.update_updated_at_column();

create table if not exists public.feedback_votes (
  id           uuid default uuid_generate_v4() primary key,
  feedback_id  uuid references public.feedback(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  created_at   timestamptz default timezone('utc', now()) not null,
  unique (feedback_id, user_id)
);
create index if not exists idx_feedback_votes_feedback_id on public.feedback_votes(feedback_id);
create index if not exists idx_feedback_votes_user_id on public.feedback_votes(user_id);

alter table public.feedback_votes enable row level security;
drop policy if exists "Anyone can view feedback votes" on public.feedback_votes;
create policy "Anyone can view feedback votes" on public.feedback_votes
  for select using (true);
drop policy if exists "Users can cast their own feedback vote" on public.feedback_votes;
create policy "Users can cast their own feedback vote" on public.feedback_votes
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own feedback vote" on public.feedback_votes;
create policy "Users can remove their own feedback vote" on public.feedback_votes
  for delete using (auth.uid() = user_id);

create or replace function public.update_feedback_vote_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.feedback set vote_count = vote_count + 1 where id = new.feedback_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.feedback set vote_count = greatest(vote_count - 1, 0) where id = old.feedback_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_feedback_vote_changed on public.feedback_votes;
create trigger on_feedback_vote_changed
  after insert or delete on public.feedback_votes
  for each row execute function public.update_feedback_vote_count();

create table if not exists public.feedback_notifications (
  id                 uuid default uuid_generate_v4() primary key,
  feedback_id        uuid references public.feedback(id) on delete cascade not null,
  user_id            uuid references public.profiles(id) on delete set null,
  email              text not null,
  notification_type  text not null check (notification_type in ('resolved','status_change','comment')),
  sent_at            timestamptz default timezone('utc', now()) not null,
  status             text not null default 'pending' check (status in ('pending','sent','failed')),
  error_message      text,
  metadata           jsonb default '{}'::jsonb
);
create index if not exists idx_feedback_notifications_feedback_id on public.feedback_notifications(feedback_id);
create index if not exists idx_feedback_notifications_status on public.feedback_notifications(status);
alter table public.feedback_notifications enable row level security;
drop policy if exists "Users can view their own notifications" on public.feedback_notifications;
create policy "Users can view their own notifications" on public.feedback_notifications
  for select using (auth.uid() = user_id or public.current_user_is_staff());

create or replace function public.queue_feedback_resolved_email()
returns trigger as $$
declare
  user_email text;
begin
  if new.email is not null then
    user_email := new.email;
  elsif new.user_id is not null then
    select email into user_email from public.profiles where id = new.user_id;
  end if;

  if user_email is not null then
    insert into public.feedback_notifications (feedback_id, user_id, email, notification_type, status, metadata)
    values (new.id, new.user_id, user_email, 'resolved', 'pending',
      jsonb_build_object('feedback_title', new.title, 'feedback_type', new.type, 'resolved_at', new.updated_at));
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_feedback_resolved on public.feedback;
create trigger on_feedback_resolved
  after update on public.feedback
  for each row
  when (new.status = 'resolved' and old.status is distinct from 'resolved')
  execute function public.queue_feedback_resolved_email();

-- ─────────────────────────────────────────────────────────────────────────
-- backlog_items (+ votes)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.backlog_items (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete set null,
  type         text not null check (type in ('feature','bug')),
  title        text not null check (char_length(title) between 3 and 200),
  description  text not null check (char_length(description) >= 10),
  status       text not null default 'open' check (status in ('open','in_progress','completed','wont_fix','duplicate')),
  priority     text not null default 'medium' check (priority in ('low','medium','high','critical')),
  tags         text[] default '{}',
  vote_count   integer default 0 not null,
  source       text default 'web' check (source in ('web','game')),
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz default timezone('utc', now()) not null,
  updated_at   timestamptz default timezone('utc', now()) not null
);
create index if not exists idx_backlog_status on public.backlog_items(status);
create index if not exists idx_backlog_vote_count on public.backlog_items(vote_count desc);
create index if not exists idx_backlog_created_at on public.backlog_items(created_at desc);

alter table public.backlog_items enable row level security;
drop policy if exists "Backlog items are public" on public.backlog_items;
create policy "Backlog items are public" on public.backlog_items
  for select using (true);
drop policy if exists "Anyone can suggest backlog items" on public.backlog_items;
create policy "Anyone can suggest backlog items" on public.backlog_items
  for insert with check (true);
drop policy if exists "Admins can update backlog items" on public.backlog_items;
create policy "Admins can update backlog items" on public.backlog_items
  for update using (public.current_user_is_staff());

drop trigger if exists on_backlog_updated on public.backlog_items;
create trigger on_backlog_updated
  before update on public.backlog_items
  for each row execute function public.update_updated_at_column();

create table if not exists public.backlog_votes (
  id               uuid default uuid_generate_v4() primary key,
  backlog_item_id  uuid references public.backlog_items(id) on delete cascade not null,
  user_id          uuid references public.profiles(id) on delete cascade not null,
  created_at       timestamptz default timezone('utc', now()) not null,
  unique (backlog_item_id, user_id)
);
create index if not exists idx_backlog_votes_item on public.backlog_votes(backlog_item_id);
create index if not exists idx_backlog_votes_user on public.backlog_votes(user_id);

alter table public.backlog_votes enable row level security;
drop policy if exists "Anyone can view backlog votes" on public.backlog_votes;
create policy "Anyone can view backlog votes" on public.backlog_votes
  for select using (true);
drop policy if exists "Users can cast their own backlog vote" on public.backlog_votes;
create policy "Users can cast their own backlog vote" on public.backlog_votes
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own backlog vote" on public.backlog_votes;
create policy "Users can remove their own backlog vote" on public.backlog_votes
  for delete using (auth.uid() = user_id);

create or replace function public.update_backlog_vote_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.backlog_items set vote_count = vote_count + 1 where id = new.backlog_item_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.backlog_items set vote_count = greatest(vote_count - 1, 0) where id = old.backlog_item_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_backlog_vote_changed on public.backlog_votes;
create trigger on_backlog_vote_changed
  after insert or delete on public.backlog_votes
  for each row execute function public.update_backlog_vote_count();

-- ─────────────────────────────────────────────────────────────────────────
-- ship_designs
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.ship_designs (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  ship_name   text not null,
  ship_data   jsonb not null,
  created_at  timestamptz default timezone('utc', now()) not null,
  updated_at  timestamptz default timezone('utc', now()) not null
);
create index if not exists idx_ship_designs_user on public.ship_designs(user_id);
alter table public.ship_designs enable row level security;
drop policy if exists "Users manage their own ships" on public.ship_designs;
create policy "Users manage their own ships" on public.ship_designs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists on_ship_designs_updated on public.ship_designs;
create trigger on_ship_designs_updated
  before update on public.ship_designs
  for each row execute function public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────
-- devlog_entries
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.devlog_entries (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique,
  title       text not null,
  content     text not null,
  date        date not null default current_date,
  tags        text[] not null default '{}',
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_devlog_entries_date on public.devlog_entries(date desc);
create index if not exists idx_devlog_entries_published on public.devlog_entries(published);
alter table public.devlog_entries enable row level security;
drop policy if exists "Published devlog is public" on public.devlog_entries;
create policy "Published devlog is public" on public.devlog_entries
  for select using (published = true or public.current_user_is_staff());
drop policy if exists "Admins manage devlog" on public.devlog_entries;
create policy "Admins manage devlog" on public.devlog_entries
  for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());
drop trigger if exists devlog_entries_updated_at on public.devlog_entries;
create trigger devlog_entries_updated_at
  before update on public.devlog_entries
  for each row execute function public.update_updated_at_column();

insert into public.devlog_entries (title, content, date, tags, published) values
(
  'Welcome to Elliot''s Devlog!',
  'This is where I''ll be sharing regular updates about the development of Explore the Universe 2175. Stay tuned for insights into game design decisions, technical challenges, and exciting new features coming to the game. Check out the roadmap and backlog to see what''s planned!',
  '2026-01-13', array['announcement','welcome'], true
),
(
  'Part 1: Bosses, AI, and Memory!',
  'This is my first official announcement and journal entry into the DevLog, where I dive into specifics about the game production process and creating a game engine from scratch, which has many benefits!',
  '2026-03-06', array['announcement'], true
)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- career_applications / investor_inquiries
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.career_applications (
  id           uuid default uuid_generate_v4() primary key,
  name         text not null check (char_length(name) >= 2),
  email        text not null,
  position     text not null,
  portfolio    text,
  message      text not null check (char_length(message) >= 20),
  resume_url   text,
  status       text not null default 'pending' check (status in ('pending','reviewing','interviewed','accepted','rejected')),
  notes        text,
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz default timezone('utc', now()) not null,
  updated_at   timestamptz default timezone('utc', now()) not null
);
alter table public.career_applications enable row level security;
drop policy if exists "Anyone can apply" on public.career_applications;
create policy "Anyone can apply" on public.career_applications
  for insert with check (true);
drop policy if exists "Admins can view applications" on public.career_applications;
create policy "Admins can view applications" on public.career_applications
  for select using (public.current_user_is_staff());
drop trigger if exists on_career_updated on public.career_applications;
create trigger on_career_updated
  before update on public.career_applications
  for each row execute function public.update_updated_at_column();

create table if not exists public.investor_inquiries (
  id                uuid default uuid_generate_v4() primary key,
  name              text not null check (char_length(name) >= 2),
  email             text not null,
  phone             text,
  company           text,
  investment_range  text,
  message           text not null check (char_length(message) >= 20),
  status            text not null default 'pending' check (status in ('pending','contacted','meeting_scheduled','interested','not_interested')),
  notes             text,
  metadata          jsonb default '{}'::jsonb,
  created_at        timestamptz default timezone('utc', now()) not null,
  updated_at        timestamptz default timezone('utc', now()) not null
);
alter table public.investor_inquiries enable row level security;
drop policy if exists "Anyone can inquire" on public.investor_inquiries;
create policy "Anyone can inquire" on public.investor_inquiries
  for insert with check (true);
drop policy if exists "Admins can view inquiries" on public.investor_inquiries;
create policy "Admins can view inquiries" on public.investor_inquiries
  for select using (public.current_user_is_staff());
drop trigger if exists on_investor_updated on public.investor_inquiries;
create trigger on_investor_updated
  before update on public.investor_inquiries
  for each row execute function public.update_updated_at_column();
