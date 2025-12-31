-- Create feedback voting system
-- This migration adds voting/upvoting functionality to feedback

-- Add vote_count column to feedback table
ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0 NOT NULL;

-- Create feedback_votes table
CREATE TABLE IF NOT EXISTS public.feedback_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  feedback_id UUID REFERENCES public.feedback(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(feedback_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_votes_feedback_id ON public.feedback_votes(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_user_id ON public.feedback_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_vote_count ON public.feedback(vote_count DESC);

-- Add comments
COMMENT ON TABLE public.feedback_votes IS 'User votes/upvotes on feedback items';
COMMENT ON COLUMN public.feedback.vote_count IS 'Total number of upvotes for this feedback';

-- Enable Row Level Security
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedback_votes
CREATE POLICY "Anyone can view votes"
  ON public.feedback_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.feedback_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can remove their own votes"
  ON public.feedback_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update vote count on feedback items
CREATE OR REPLACE FUNCTION public.update_feedback_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.feedback
    SET vote_count = vote_count + 1
    WHERE id = NEW.feedback_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.feedback
    SET vote_count = GREATEST(vote_count - 1, 0)
    WHERE id = OLD.feedback_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update vote count automatically
DROP TRIGGER IF EXISTS on_feedback_vote_changed ON public.feedback_votes;
CREATE TRIGGER on_feedback_vote_changed
  AFTER INSERT OR DELETE ON public.feedback_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_feedback_vote_count();

-- Grant permissions
GRANT SELECT ON public.feedback_votes TO anon, authenticated;
GRANT INSERT, DELETE ON public.feedback_votes TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Feedback voting system created successfully!';
  RAISE NOTICE 'Users can now upvote feedback items';
  RAISE NOTICE 'Vote counts are automatically maintained';
END $$;
