import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://osvrbwvxnbpwsmgvdmkm.supabase.co"
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdnJid3Z4bmJwd3NtZ3ZkbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjM4MTYsImV4cCI6MjA3NDk5OTgxNn0.1WS43PMFLACSXhR2TGDUEJb0VIIsQhcE3HaPBQra8sQ"

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

// POST - Process pending email notifications
// This should be called by a cron job or manually
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication for cron job
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, require it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get pending notifications
    const { data: notifications, error } = await (supabase as any)
      .from('feedback_notifications')
      .select(`
        *,
        feedback:feedback(id, title, description, type, status)
      `)
      .eq('status', 'pending')
      .limit(10) // Process 10 at a time

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({
        message: 'No pending notifications to send',
        processed: 0
      })
    }

    const results = []

    for (const notification of notifications) {
      try {
        // TODO: Replace with actual email service (Resend, SendGrid, etc.)
        // For now, just log and mark as sent
        const emailSent = await sendEmail(notification)

        if (emailSent) {
          // Mark as sent
          await (supabase as any)
            .from('feedback_notifications')
            .update({ status: 'sent' })
            .eq('id', notification.id)

          results.push({
            id: notification.id,
            email: notification.email,
            status: 'sent'
          })
        } else {
          // Mark as failed
          await (supabase as any)
            .from('feedback_notifications')
            .update({
              status: 'failed',
              error_message: 'Email service not configured'
            })
            .eq('id', notification.id)

          results.push({
            id: notification.id,
            email: notification.email,
            status: 'failed'
          })
        }
      } catch (err: any) {
        console.error('Error processing notification:', err)

        // Mark as failed
        await (supabase as any)
          .from('feedback_notifications')
          .update({
            status: 'failed',
            error_message: err.message
          })
          .eq('id', notification.id)

        results.push({
          id: notification.id,
          email: notification.email,
          status: 'failed',
          error: err.message
        })
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} notifications`,
      processed: results.length,
      results
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Send email function - replace with actual email service
async function sendEmail(notification: any): Promise<boolean> {
  // TODO: Integrate with email service like Resend, SendGrid, or Mailgun
  // For now, just console.log the email that would be sent

  console.log('📧 Email Notification:')
  console.log('To:', notification.email)
  console.log('Subject: Your feedback has been resolved!')
  console.log('Body:', generateEmailBody(notification))

  // For development, return true to mark as sent
  // In production, replace with actual email service call:
  /*
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
  */

  // For now, return true (simulating successful send)
  return true
}

function generateEmailBody(notification: any): string {
  const feedback = notification.feedback
  const metadata = notification.metadata || {}

  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: white; margin: 0;">✅ Feedback Resolved!</h1>
        </div>

        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #333; margin-top: 0;">Great news!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Your feedback has been resolved by our team. Thank you for helping us improve Explore the Universe 2175!
          </p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #667eea; margin-top: 0;">${feedback?.title || 'Your Feedback'}</h3>
            <p style="color: #666; margin: 10px 0;">
              <strong>Type:</strong> ${(feedback?.type || 'feedback').toUpperCase()}
            </p>
            <p style="color: #666; margin: 10px 0;">
              <strong>Description:</strong><br/>
              ${feedback?.description || ''}
            </p>
          </div>

          <p style="color: #666; font-size: 14px;">
            We appreciate you taking the time to share your thoughts. Your feedback helps us create a better experience for everyone.
          </p>

          <div style="text-align: center; margin-top: 30px;">
            <a href="https://www.exploretheuniverse2175.com/feedback"
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Your Feedback
            </a>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
          <p>Explore the Universe 2175 - Space RPG Game</p>
          <p>Visit us at <a href="https://www.exploretheuniverse2175.com" style="color: #667eea;">exploretheuniverse2175.com</a></p>
        </div>
      </body>
    </html>
  `
}
