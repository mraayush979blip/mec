-- ============================================
-- SOCIAL FEATURES SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. IN-APP NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT, -- e.g. /dashboard/events?id=xxx
  is_read BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'general', -- 'join_request', 'approval', 'event', 'message', 'general'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON in_app_notifications(user_id, is_read);
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON in_app_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON in_app_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON in_app_notifications FOR INSERT WITH CHECK (true);

-- Auto-cleanup: delete notifications older than 60 days (save DB space)
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 2 * * 0',
  $$ DELETE FROM in_app_notifications WHERE created_at < NOW() - INTERVAL '60 days' $$
) ON CONFLICT DO NOTHING;


-- 2. DIRECT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, is_read);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receivers can mark read" ON messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Auto-cleanup: delete messages older than 30 days
SELECT cron.schedule(
  'cleanup-old-messages',
  '0 3 * * 0',
  $$ DELETE FROM messages WHERE created_at < NOW() - INTERVAL '30 days' $$
) ON CONFLICT DO NOTHING;


-- 3. EVENT COMMENTS TABLE
CREATE TABLE IF NOT EXISTS event_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_event ON event_comments(event_id, created_at);
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read comments" ON event_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON event_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON event_comments FOR DELETE USING (auth.uid() = user_id);


-- 4. KEEP-ALIVE FUNCTION (prevents project pause)
-- Call this from a weekly cron job / GitHub Actions
CREATE OR REPLACE FUNCTION keep_alive() RETURNS TEXT AS $$
  SELECT 'alive'::TEXT;
$$ LANGUAGE SQL;
