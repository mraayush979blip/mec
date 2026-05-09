export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { eventTitle } = req.body;

  if (!eventTitle) {
    return res.status(400).json({ error: 'eventTitle is required' });
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In a real app, move this key to Vercel env vars, e.g. process.env.ONESIGNAL_REST_API_KEY
        'Authorization': 'Basic os_v2_app_52d4ulf5rbf37ktrcwwgy36xvxlydgw76uyerkfj4o6ty5fcxcbgrydvgfrugsl5x6epu4viwzl4bgpwn3yubphdedmqvhl4pwmwfxy'
      },
      body: JSON.stringify({
        app_id: "ee87ca2c-bd88-4bbf-aa71-15ac6c6fd7ad",
        included_segments: ["All"],
        headings: { "en": "New MECHA Activity! 🚀" },
        contents: { "en": `${eventTitle} has been posted. Open the app to join now!` },
        url: "https://mechatronics-phi.vercel.app/"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OneSignal Error:', data);
      return res.status(response.status).json(data);
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error sending push notification:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
