export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { title, body, url, userIds } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  const appId = process.env.ONESIGNAL_APP_ID || 'ee87ca2c-bd88-4bbf-aa71-15ac6c6fd7ad';

  if (!apiKey) {
    return res.status(500).json({ error: 'ONESIGNAL_REST_API_KEY not configured in environment variables' });
  }

  try {
    const payload = {
      app_id: appId,
      headings: { en: title },
      contents: { en: body },
      url: url || 'https://mechatronics-phi.vercel.app/dashboard/events',
    };

    // If specific userIds provided, target them; otherwise send to All subscribers
    if (userIds && userIds.length > 0) {
      payload.include_external_user_ids = userIds;
      payload.channel_for_external_user_ids = 'push';
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

    const data = await response.json();

    if (!response.ok) {
      console.error('OneSignal Error:', data);
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({ success: true, recipients: data.recipients });
  } catch (error) {
    console.error('Push notification error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
