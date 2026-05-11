import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const OAuth2 = google.auth.OAuth2;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { title, body, userIds, url } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  // 1. Validate Environment Variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase configuration missing');
    return res.status(500).json({ error: 'Server configuration error: Supabase keys missing' });
  }

  // Initialize Supabase
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 2. Fetch Recipient Emails & Profiles
    let recipients = [];
    if (userIds && userIds.length > 0) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('email, full_name')
        .in('id', userIds);
      
      if (!error && profiles) {
        recipients = profiles;
      }
    } else if (userIds === null || (Array.isArray(userIds) && userIds.length === 0 && req.body.broadcast)) {
      // Fetch ALL emails for broadcast/global posts
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('email, full_name');
      
      if (!error && profiles) {
        recipients = profiles;
      }
    }

    // 3. Send Push via OneSignal
    const oneSignalResponse = await sendOneSignalPush(title, body, userIds, url);
    
    // 4. Send Email via Gmail OAuth 2.0
    let emailResults = [];
    let emailStatus = 'skipped';
    
    if (recipients.length > 0) {
      try {
        emailResults = await sendGmailEmails(
          recipients, 
          title, 
          body, 
          url, 
          req.body.emailSubject, 
          req.body.emailBody
        );
        emailStatus = 'success';
      } catch (err) {
        console.error('Gmail send error:', err);
        emailStatus = 'failed';
      }
    }

    // 5. Log to email_logs for Admin
    await supabase.from('email_logs').insert([{
      subject: req.body.emailSubject || title,
      body: req.body.emailBody || body,
      recipient_count: recipients.length,
      status: emailStatus,
      type: req.body.type || 'notification',
      event_title: title // So it shows up correctly in Admin Dashboard
    }]);


    return res.status(200).json({ 
      success: true, 
      push: oneSignalResponse,
      emailsSent: recipients.length,
      status: emailStatus
    });

  } catch (error) {
    console.error('Notification system error:', error);
    return res.status(500).json({ error: error.message });
  }
}


async function sendOneSignalPush(title, body, userIds, url) {
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  const appId = process.env.ONESIGNAL_APP_ID;

  if (!apiKey || !appId) return { skipped: 'OneSignal not configured' };

  const payload = {
    app_id: appId,
    headings: { en: title },
    contents: { en: body },
    url: url || 'https://mechatronics-phi.vercel.app/dashboard',
  };

  if (userIds && userIds.length > 0) {
    payload.include_external_user_ids = userIds;
  } else {
    payload.included_segments = ['All'];
  }

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  return await response.json();
}

async function sendGmailEmails(recipients, title, body, url, emailSubject, emailBody) {
  const {
    GMAIL_USER,
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN
  } = process.env;

  if (!GMAIL_USER || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    console.warn('Gmail OAuth2 not fully configured. Skipping emails.');
    return [];
  }

  const oauth2Client = new OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: GMAIL_REFRESH_TOKEN
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        console.error("Gmail Auth Error:", err);
        reject("Failed to create access token: " + err.message);
      }
      resolve(token);
    });
  });


  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: GMAIL_USER,
      accessToken,
      clientId: GMAIL_CLIENT_ID,
      clientSecret: GMAIL_CLIENT_SECRET,
      refreshToken: GMAIL_REFRESH_TOKEN
    }
  });

  const emailPromises = recipients.map(user => {
    if (!user.email) return Promise.resolve();

    const mailOptions = {
      from: `Mechatronian Hub <${GMAIL_USER}>`,
      to: user.email,
      subject: emailSubject || title,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            .container {
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              border: 1px solid #f0f0f0;
            }
            .header {
              background: linear-gradient(135deg, #007AFF 0%, #AF52DE 100%);
              padding: 40px 20px;
              text-align: center;
              color: white;
            }
            .content {
              padding: 40px 30px;
              color: #1d1d1f;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              padding: 16px 32px;
              background: #007AFF;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 16px;
              font-weight: 700;
              margin: 30px 0;
              box-shadow: 0 10px 20px rgba(0,122,255,0.3);
            }
            .footer {
              background-color: #f5f5f7;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #86868b;
            }
          </style>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #fbfbfd;">
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Mechatronian Pulse</h1>
            </div>
            <div class="content">
              <h2 style="margin-top: 0; color: #007AFF; font-size: 22px;">${emailSubject || title}</h2>
              <p style="font-size: 16px; color: #424245;">Hi <strong>${user.full_name || 'Student'}</strong>,</p>
              <p style="font-size: 16px; white-space: pre-wrap;">${emailBody || body}</p>
              
              <div style="text-align: center;">
                <a href="${url || 'https://mechatronics-phi.vercel.app/'}" class="button">View on Platform</a>
              </div>
              
              <p style="font-size: 14px; color: #86868b; margin-top: 40px;">
                You received this because you are a registered member of the Mechatronian Hub Community.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">&copy; 2026 Mechatronian Hub. All rights reserved.</p>
              <p style="margin: 5px 0 0 0;">Designed for the next generation of engineers.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };


    return transporter.sendMail(mailOptions);
  });

  return Promise.all(emailPromises);
}

