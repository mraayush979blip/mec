import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase Client with the service role key to bypass RLS on write
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Allow only POST or GET requests (GET allows triggering via standard cron tools)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Fetch live hackathons from Devpost's open listings internal API
    const devpostUrl = 'https://devpost.com/api/hackathons?challenge_type[]=online&challenge_type[]=in-person&status[]=submission-open';
    const response = await fetch(devpostUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from Devpost: ${response.statusText}`);
    }

    const data = await response.json();
    const fetchedHackathons = data.hackathons || [];

    if (fetchedHackathons.length === 0) {
      return res.status(200).json({ success: true, message: 'No active hackathons found to sync.' });
    }

    // 2. Map Devpost data to our public.external_hackathons table schema
    const hackathonsToUpsert = fetchedHackathons.map(h => {
      // Clean description or fallback
      let description = h.description || h.tagline || 'No description provided.';
      if (description.length > 200) {
        description = description.substring(0, 197) + '...';
      }

      // Generate a premium fallback image if thumbnail is missing
      const image_url = h.thumbnail_url || 
                        h.large_image_url || 
                        'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1000';

      return {
        title: h.title,
        description: description,
        date: h.submission_period_dates || 'Submission Open',
        link: h.url,
        image_url: image_url,
        source: 'Devpost'
      };
    });

    // 3. Upsert into Supabase (ON CONFLICT (link) DO UPDATE matching fields)
    const { data: upsertedData, error } = await supabase
      .from('external_hackathons')
      .upsert(hackathonsToUpsert, { onConflict: 'link' })
      .select();

    if (error) {
      console.error('Supabase Upsert Error:', error);
      return res.status(500).json({ success: false, error: 'Database write error', details: error.message });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully synchronized hackathons from Devpost!`,
      fetched_count: fetchedHackathons.length,
      synced_count: upsertedData ? upsertedData.length : 0
    });

  } catch (error) {
    console.error('Sync Hackathons Error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
}
