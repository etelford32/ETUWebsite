-- Create devlog_entries table for admin-managed devlog posts
-- Run this in your Supabase SQL editor or via supabase db push

CREATE TABLE IF NOT EXISTS public.devlog_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        UNIQUE,                          -- optional URL-friendly id
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  published   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS devlog_entries_updated_at ON public.devlog_entries;
CREATE TRIGGER devlog_entries_updated_at
  BEFORE UPDATE ON public.devlog_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_devlog_entries_date ON public.devlog_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_devlog_entries_published ON public.devlog_entries(published);

-- Enable Row Level Security
ALTER TABLE public.devlog_entries ENABLE ROW LEVEL SECURITY;

-- Public can read published entries
CREATE POLICY "Anyone can read published devlog entries"
  ON public.devlog_entries FOR SELECT
  USING (published = TRUE);

-- Admins can read all entries (including drafts)
CREATE POLICY "Admins can read all devlog entries"
  ON public.devlog_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can insert
CREATE POLICY "Admins can insert devlog entries"
  ON public.devlog_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update
CREATE POLICY "Admins can update devlog entries"
  ON public.devlog_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can delete devlog entries"
  ON public.devlog_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seed the initial entries from the hardcoded page
INSERT INTO public.devlog_entries (title, content, date, tags, published) VALUES
(
  'Welcome to Elliot''s Devlog!',
  'This is where I''ll be sharing regular updates about the development of Explore the Universe 2175. Stay tuned for insights into game design decisions, technical challenges, and exciting new features coming to the game. Check out the roadmap and backlog to see what''s planned!',
  '2026-01-13',
  ARRAY['announcement', 'welcome'],
  TRUE
),
(
  'Part 1: Bosses, AI, and Memory!',
  'This is my first official announcements and journal entry into the DevLog, where I dive into specifics about the game production process and creating a game engine from scratch, which has many benefits!',
  '2026-03-06',
  ARRAY['announcement'],
  TRUE
)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE 'devlog_entries table created successfully!';
  RAISE NOTICE 'Run this migration in Supabase SQL editor to enable the CMS.';
END $$;
