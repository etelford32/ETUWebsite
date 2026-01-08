import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      username,
      email,
      discord,
      interests,
      experience,
      availability,
      motivation,
      balancingInterest,
      aiDifficultyFeedback,
      bugTestingExperience
    } = body

    // Validation
    if (!username || !email || !interests || interests.length === 0 || !motivation) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Store in database (create table if needed)
    const { data: application, error: dbError } = await supabase
      .from('alpha_applications')
      .insert([
        {
          username,
          email,
          discord,
          interests,
          experience,
          availability,
          motivation,
          balancing_interest: balancingInterest,
          ai_difficulty_feedback: aiDifficultyFeedback,
          bug_testing_experience: bugTestingExperience,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    // Don't fail if table doesn't exist - we'll just send the email
    if (dbError && !dbError.message.includes('does not exist')) {
      console.error('Database error:', dbError)
    }

    // Format the email content
    const interestLabels: { [key: string]: string } = {
      'balancing': 'Game Balancing',
      'ai-testing': 'AI Difficulty Testing',
      'bug-hunting': 'Bug Hunting',
      'feedback': 'General Feedback',
      'competitive': 'Competitive Play',
      'content': 'Content Testing'
    }

    const selectedInterests = interests.map((i: string) => interestLabels[i] || i).join(', ')

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #1e293b; }
    .value { color: #475569; margin-top: 5px; white-space: pre-wrap; }
    .interests { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
    .interest-tag { background: #06b6d4; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🚀 New Alpha Testing Application</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Explore the Universe 2175</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Username:</div>
        <div class="value">${username}</div>
      </div>

      <div class="field">
        <div class="label">Email:</div>
        <div class="value">${email}</div>
      </div>

      ${discord ? `
      <div class="field">
        <div class="label">Discord:</div>
        <div class="value">${discord}</div>
      </div>
      ` : ''}

      <div class="field">
        <div class="label">Testing Interests:</div>
        <div class="interests">
          ${interests.map((i: string) => `<span class="interest-tag">${interestLabels[i] || i}</span>`).join('')}
        </div>
      </div>

      <div class="field">
        <div class="label">Experience Level:</div>
        <div class="value">${experience.charAt(0).toUpperCase() + experience.slice(1)}</div>
      </div>

      ${availability ? `
      <div class="field">
        <div class="label">Availability:</div>
        <div class="value">${availability}</div>
      </div>
      ` : ''}

      <div class="field">
        <div class="label">Motivation:</div>
        <div class="value">${motivation}</div>
      </div>

      ${balancingInterest ? `
      <div class="field">
        <div class="label">Game Balancing Interest:</div>
        <div class="value">${balancingInterest}</div>
      </div>
      ` : ''}

      ${aiDifficultyFeedback ? `
      <div class="field">
        <div class="label">AI Difficulty Testing Focus:</div>
        <div class="value">${aiDifficultyFeedback}</div>
      </div>
      ` : ''}

      ${bugTestingExperience ? `
      <div class="field">
        <div class="label">Bug Testing Experience:</div>
        <div class="value">${bugTestingExperience}</div>
      </div>
      ` : ''}

      <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          View all applications in your <a href="https://yoursite.com/admin" style="color: #06b6d4;">admin dashboard</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()

    // Send Discord webhook notification
    try {
      const discordWebhookUrl = 'https://discord.com/api/webhooks/1458859257553227901/Y2l5AfqWwkVSkQXblX2_z-b481UDPc62g-Tv4JjrvYsvHZ_MijZY_2uHPc5vgdbSOffL'

      const discordEmbed = {
        embeds: [{
          title: '🚀 New Alpha Testing Application!',
          description: `**${username}** has applied for alpha testing`,
          color: 0x06b6d4, // Cyan color
          fields: [
            {
              name: '📧 Email',
              value: email,
              inline: true
            },
            ...(discord ? [{
              name: '💬 Discord',
              value: discord,
              inline: true
            }] : []),
            {
              name: '🎯 Testing Interests',
              value: selectedInterests,
              inline: false
            },
            {
              name: '🎮 Experience Level',
              value: experience.charAt(0).toUpperCase() + experience.slice(1),
              inline: true
            },
            ...(availability ? [{
              name: '⏰ Availability',
              value: availability,
              inline: true
            }] : []),
            {
              name: '💭 Motivation',
              value: motivation.length > 200 ? motivation.substring(0, 200) + '...' : motivation,
              inline: false
            },
            ...(balancingInterest ? [{
              name: '⚖️ Game Balancing Interest',
              value: balancingInterest.length > 200 ? balancingInterest.substring(0, 200) + '...' : balancingInterest,
              inline: false
            }] : []),
            ...(aiDifficultyFeedback ? [{
              name: '🧠 AI Difficulty Focus',
              value: aiDifficultyFeedback.length > 200 ? aiDifficultyFeedback.substring(0, 200) + '...' : aiDifficultyFeedback,
              inline: false
            }] : []),
            ...(bugTestingExperience ? [{
              name: '🐛 Bug Testing Experience',
              value: bugTestingExperience.length > 200 ? bugTestingExperience.substring(0, 200) + '...' : bugTestingExperience,
              inline: false
            }] : [])
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Explore the Universe 2175 Alpha Applications'
          }
        }]
      }

      const discordResponse = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(discordEmbed)
      })

      if (!discordResponse.ok) {
        console.error('Discord webhook failed:', await discordResponse.text())
      } else {
        console.log('Discord notification sent successfully')
      }
    } catch (discordError) {
      console.error('Discord webhook error:', discordError)
      // Don't fail the request if Discord fails
    }

    // Try to send email if Resend is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'ETU Alpha Applications <noreply@exploretheuniverse2175.com>',
            to: ['etelford32@gmail.com'],
            subject: `🎮 New Alpha Tester Application - ${username}`,
            html: emailContent
          })
        })

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text()
          console.error('Email send failed:', errorText)
        } else {
          console.log('Email sent successfully to etelford32@gmail.com')
        }
      } catch (emailError) {
        console.error('Email error:', emailError)
        // Don't fail the request if email fails
      }
    } else {
      console.log('RESEND_API_KEY not configured - email not sent. Application saved to database.')
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully'
    })
  } catch (error) {
    console.error('Error submitting application:', error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}
