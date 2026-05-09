export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { subject, htmlContent, recipients } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Recipients array is required' });
  }

  const API_KEY = process.env.VITE_BREVO_API_KEY || process.env.BREVO_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'Brevo API key is not configured on the server.' });
  }

  // Brevo API limits 99 emails per request, chunking to 50 to be safe
  const chunkSize = 50;
  const chunks = [];
  for (let i = 0; i < recipients.length; i += chunkSize) {
    chunks.push(recipients.slice(i, i + chunkSize));
  }

  try {
    let successCount = 0;
    
    for (const chunk of chunks) {
      const bccList = chunk.map(email => ({ email }));
      
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Admin', email: 'admin@mechatronian.com' }, // Update with verified sender email if needed
          bcc: bccList,
          subject: subject,
          htmlContent: htmlContent
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Brevo Error:', errorData);
        // Continue with other chunks even if one fails
      } else {
        successCount += chunk.length;
      }
    }

    return res.status(200).json({ success: true, message: `Sent emails to ${successCount} recipients.` });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
