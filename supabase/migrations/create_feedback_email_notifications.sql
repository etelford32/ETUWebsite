-- Create email notification system for resolved feedback
-- This migration sets up automatic email notifications when feedback is resolved

-- Create notifications table to track sent emails
CREATE TABLE IF NOT EXISTS public.feedback_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  feedback_id UUID REFERENCES public.feedback(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('resolved', 'status_change', 'comment')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feedback_notifications_feedback_id ON public.feedback_notifications(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_notifications_user_id ON public.feedback_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_notifications_status ON public.feedback_notifications(status);
CREATE INDEX IF NOT EXISTS idx_feedback_notifications_sent_at ON public.feedback_notifications(sent_at DESC);

-- Add comments
COMMENT ON TABLE public.feedback_notifications IS 'Email notifications sent to users about their feedback';
COMMENT ON COLUMN public.feedback_notifications.notification_type IS 'Type of notification (resolved, status_change, comment)';
COMMENT ON COLUMN public.feedback_notifications.status IS 'Status of email delivery (pending, sent, failed)';

-- Enable Row Level Security
ALTER TABLE public.feedback_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.feedback_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Function to queue email notification when feedback is resolved
CREATE OR REPLACE FUNCTION public.queue_feedback_resolved_email()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  feedback_title TEXT;
BEGIN
  -- Check if status changed to 'resolved'
  IF NEW.status = 'resolved' AND (OLD.status IS NULL OR OLD.status != 'resolved') THEN

    -- Get user email
    IF NEW.email IS NOT NULL THEN
      user_email := NEW.email;
    ELSIF NEW.user_id IS NOT NULL THEN
      SELECT email INTO user_email FROM public.profiles WHERE id = NEW.user_id;
    END IF;

    -- Only queue if we have an email
    IF user_email IS NOT NULL THEN
      INSERT INTO public.feedback_notifications (
        feedback_id,
        user_id,
        email,
        notification_type,
        status,
        metadata
      ) VALUES (
        NEW.id,
        NEW.user_id,
        user_email,
        'resolved',
        'pending',
        jsonb_build_object(
          'feedback_title', NEW.title,
          'feedback_type', NEW.type,
          'resolved_at', NEW.updated_at
        )
      );

      RAISE NOTICE 'Queued email notification for feedback ID: % to email: %', NEW.id, user_email;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to queue emails when feedback is resolved
DROP TRIGGER IF EXISTS on_feedback_resolved ON public.feedback;
CREATE TRIGGER on_feedback_resolved
  AFTER UPDATE ON public.feedback
  FOR EACH ROW
  WHEN (NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM 'resolved'))
  EXECUTE FUNCTION public.queue_feedback_resolved_email();

-- Grant permissions
GRANT SELECT ON public.feedback_notifications TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Email notification system created successfully!';
  RAISE NOTICE 'Emails will be queued when feedback is marked as resolved';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Set up email service integration (Resend, SendGrid, etc.)';
  RAISE NOTICE '2. Create cron job or Edge Function to process pending notifications';
  RAISE NOTICE '3. Update notification status after sending';
END $$;
