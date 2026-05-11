export const sendNotification = async ({ title, body, userIds, url, emailSubject, emailBody }) => {
  try {
    const res = await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        userIds,
        url,
        emailSubject: emailSubject || title,
        emailBody: emailBody || body
      })
    });
    
    if (!res.ok) {
      const err = await res.json();
      console.warn('Notification delivery failed:', err);
      return { success: false, error: err };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Notification error:', err);
    return { success: false, error: err.message };
  }
};
