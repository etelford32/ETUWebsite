# 📧 Email Notifications Setup Guide

This guide explains how to set up email notifications for feedback resolution.

## Overview

The system automatically queues email notifications when:
- Feedback status changes to "resolved"
- Admin marks a ticket as complete

Emails inform users that their feedback has been addressed.

## Database Setup

### 1. Run the Migration

Go to Supabase SQL Editor and run:
```
supabase/migrations/create_feedback_email_notifications.sql
```

This creates:
- ✅ `feedback_notifications` table - Email queue
- ✅ Automatic trigger - Queues emails when feedback resolved
- ✅ Database function - Handles email queueing

### 2. How It Works

```
Feedback Status → "resolved"
     ↓
Trigger fires
     ↓
Email queued in feedback_notifications table
     ↓
Cron job processes queue
     ↓
Email sent to user
```

## Email Service Integration

### Option 1: Resend (Recommended)

[Resend](https://resend.com) - Modern email API

**Setup:**
1. Sign up at https://resend.com
2. Get API key
3. Add to `.env.local`:
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

4. Update `/src/app/api/notifications/send/route.ts`:
```typescript
async function sendEmail(notification: any): Promise<boolean> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'ETU 2175 <noreply@exploretheuniverse2175.com>',
      to: notification.email,
      subject: 'Your feedback has been resolved!',
      html: generateEmailBody(notification)
    })
  })

  return response.ok
}
```

### Option 2: SendGrid

[SendGrid](https://sendgrid.com) - Enterprise email service

**Setup:**
1. Sign up at https://sendgrid.com
2. Get API key
3. Add to `.env.local`:
```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

4. Install package:
```bash
npm install @sendgrid/mail
```

5. Update code:
```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

async function sendEmail(notification: any): Promise<boolean> {
  try {
    await sgMail.send({
      to: notification.email,
      from: 'noreply@exploretheuniverse2175.com',
      subject: 'Your feedback has been resolved!',
      html: generateEmailBody(notification)
    })
    return true
  } catch (error) {
    console.error('SendGrid error:', error)
    return false
  }
}
```

### Option 3: Mailgun

[Mailgun](https://www.mailgun.com) - Developer-friendly email

**Setup:**
1. Sign up at https://www.mailgun.com
2. Get API key and domain
3. Add to `.env.local`:
```bash
MAILGUN_API_KEY=xxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.yourdomain.com
```

4. Install package:
```bash
npm install mailgun.js form-data
```

5. Update code:
```typescript
import formData from 'form-data'
import Mailgun from 'mailgun.js'

const mailgun = new Mailgun(formData)
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY!
})

async function sendEmail(notification: any): Promise<boolean> {
  try {
    await mg.messages.create(process.env.MAILGUN_DOMAIN!, {
      from: 'ETU 2175 <noreply@exploretheuniverse2175.com>',
      to: [notification.email],
      subject: 'Your feedback has been resolved!',
      html: generateEmailBody(notification)
    })
    return true
  } catch (error) {
    console.error('Mailgun error:', error)
    return false
  }
}
```

## Processing Email Queue

### Manual Trigger

Call the API endpoint to process pending emails:
```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Automated with Vercel Cron

1. Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/notifications/send",
    "schedule": "*/15 * * * *"
  }]
}
```

This runs every 15 minutes.

2. Set CRON_SECRET:
```bash
# .env.local
CRON_SECRET=your-random-secret-here
```

### Automated with GitHub Actions

Create `.github/workflows/send-emails.yml`:
```yaml
name: Send Email Notifications

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  send-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger email sending
        run: |
          curl -X POST https://yoursite.com/api/notifications/send \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Automated with Supabase Edge Functions

Create `supabase/functions/send-emails/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Call your API endpoint
  const response = await fetch('https://yoursite.com/api/notifications/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('CRON_SECRET')}`
    }
  })

  const result = await response.json()

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Deploy:
```bash
supabase functions deploy send-emails
```

Add cron trigger in Supabase Dashboard → Edge Functions → Cron

## Email Template Customization

Edit the `generateEmailBody()` function in `/src/app/api/notifications/send/route.ts`:

```typescript
function generateEmailBody(notification: any): string {
  const feedback = notification.feedback

  return `
    <html>
      <body>
        <!-- Your custom HTML template here -->
        <h1>Your feedback was resolved!</h1>
        <p>${feedback.title}</p>
        <!-- Add your branding, styling, etc. -->
      </body>
    </html>
  `
}
```

## Testing

### 1. Test Email Queueing

Mark feedback as resolved in admin dashboard:
```
/admin/feedback
→ Edit feedback
→ Change status to "resolved"
→ Save
```

Check the database:
```sql
SELECT * FROM feedback_notifications WHERE status = 'pending';
```

You should see a pending notification.

### 2. Test Email Sending

Trigger the send endpoint:
```bash
curl -X POST http://localhost:3000/api/notifications/send
```

Check console logs to see "Email sent" messages.

Check database again:
```sql
SELECT * FROM feedback_notifications WHERE status = 'sent';
```

Status should update to 'sent'.

### 3. Test Email Delivery

Once you've integrated a real email service:
1. Create test feedback with your email
2. Mark as resolved
3. Wait for cron job (or trigger manually)
4. Check your inbox!

## Monitoring

### Check Notification Status

```sql
-- Pending emails
SELECT COUNT(*) FROM feedback_notifications WHERE status = 'pending';

-- Failed emails
SELECT * FROM feedback_notifications
WHERE status = 'failed'
ORDER BY sent_at DESC;

-- Sent emails (last 24 hours)
SELECT COUNT(*) FROM feedback_notifications
WHERE status = 'sent'
AND sent_at > NOW() - INTERVAL '24 hours';
```

### View Failed Notifications

```sql
SELECT
  fn.id,
  fn.email,
  fn.error_message,
  f.title as feedback_title,
  fn.sent_at
FROM feedback_notifications fn
LEFT JOIN feedback f ON f.id = fn.feedback_id
WHERE fn.status = 'failed'
ORDER BY fn.sent_at DESC;
```

### Retry Failed Notifications

```sql
-- Reset failed notifications to retry
UPDATE feedback_notifications
SET status = 'pending', error_message = NULL
WHERE status = 'failed';
```

## Production Checklist

- [ ] Email service configured (Resend/SendGrid/Mailgun)
- [ ] API keys added to environment variables
- [ ] Cron job set up (Vercel/GitHub Actions/Supabase)
- [ ] `CRON_SECRET` configured for security
- [ ] Email template customized with branding
- [ ] Test emails sent successfully
- [ ] Monitoring dashboard set up
- [ ] Error handling tested
- [ ] Sender domain verified (for deliverability)
- [ ] Unsubscribe link added (optional, for compliance)

## Troubleshooting

### Emails Not Being Queued

1. Check if trigger is created:
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_feedback_resolved';
```

2. Check RLS policies allow inserting notifications

3. Verify feedback status is changing to exactly 'resolved'

### Emails Not Being Sent

1. Check pending notifications exist:
```sql
SELECT * FROM feedback_notifications WHERE status = 'pending';
```

2. Verify cron job is running (check logs)

3. Check API endpoint authentication

4. Verify email service API key is correct

### Emails Going to Spam

1. Set up SPF, DKIM, DMARC records
2. Use verified sender domain
3. Warm up your sending domain gradually
4. Include unsubscribe link
5. Use reputable email service

## Cost Estimates

**Resend:**
- Free: 100 emails/day
- Pro: $20/month for 50,000 emails

**SendGrid:**
- Free: 100 emails/day
- Essentials: $19.95/month for 50,000 emails

**Mailgun:**
- Free: 5,000 emails/month
- Pay as you go: $0.80/1,000 emails

## Support

For issues:
- Check console logs for errors
- Review database for failed notifications
- Test email service API directly
- Check spam folder

---

**Status:** Email notifications ready to integrate! 🚀
