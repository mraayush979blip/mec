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
    }

    // 3. Send Push via OneSignal
    const oneSignalResponse = await sendOneSignalPush(title, body, userIds, url);
    
    // 4. Send Email via Gmail OAuth 2.0
    let emailResults = [];
    if (recipients.length > 0) {
      emailResults = await sendGmailEmails(
        recipients, 
        title, 
        body, 
        url, 
        req.body.emailSubject, 
        req.body.emailBody
      );
    }


    return res.status(200).json({ 
      success: true, 
      push: oneSignalResponse,
      emailsSent: emailResults.length
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
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #007AFF;">${emailSubject || title}</h2>
          <p>Hi ${user.full_name || 'Student'},</p>
          <p style="font-size: 16px; line-height: 1.5; color: #333; white-space: pre-wrap;">${emailBody || body}</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${url || 'https://mechatronics-phi.vercel.app/'}" 
               style="background-color: #007AFF; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
               View on Dashboard
            </a>
          </div>
          <hr style="margin-top: 40px; border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            Mechatronian Hub Platform - Automated Notification
          </p>
        </div>
      `
    };

    return transporter.sendMail(mailOptions);
  });

  return Promise.all(emailPromises);
}

