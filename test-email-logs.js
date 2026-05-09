import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('email_logs').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Email Logs:", data);
  if (error) console.error("Error:", error);
}
run();
