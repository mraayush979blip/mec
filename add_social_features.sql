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
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON in_app_notifications(user_id, is_read);
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid errors on rerun
DROP POLICY IF EXISTS "Users see own notifications" ON in_app_notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON in_app_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON in_app_notifications;

CREATE POLICY "Users see own notifications" ON in_app_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON in_app_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON in_app_notifications FOR INSERT WITH CHECK (true);

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
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own messages" ON messages;
DROP POLICY IF EXISTS "Users send messages" ON messages;
DROP POLICY IF EXISTS "Receivers can mark read" ON messages;

CREATE POLICY "Users see own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receivers can mark read" ON messages FOR UPDATE USING (auth.uid() = receiver_id);

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

DROP POLICY IF EXISTS "Anyone can read comments" ON event_comments;
DROP POLICY IF EXISTS "Authenticated users can comment" ON event_comments;
DROP POLICY IF EXISTS "Users delete own comments" ON event_comments;

CREATE POLICY "Anyone can read comments" ON event_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON event_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON event_comments FOR DELETE USING (auth.uid() = user_id);

-- 4. TEAM GROUP CHAT TABLE
CREATE TABLE IF NOT EXISTS team_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES team_listings(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT team_or_listing CHECK (
    (team_id IS NOT NULL AND listing_id IS NULL) OR
    (listing_id IS NOT NULL AND team_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_team_messages_team ON team_messages(team_id, created_at);
CREATE INDEX IF NOT EXISTS idx_team_messages_listing ON team_messages(listing_id, created_at);
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event team members can read" ON team_messages;
DROP POLICY IF EXISTS "Team members can send" ON team_messages;

CREATE POLICY "Event team members can read" ON team_messages FOR SELECT USING (
  (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_members WHERE team_members.team_id = team_messages.team_id AND team_members.user_id = auth.uid()
  )) OR
  (listing_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM team_listings WHERE id = team_messages.listing_id AND creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM join_requests WHERE listing_id = team_messages.listing_id AND applicant_id = auth.uid() AND status = 'approved')
  )) OR
  auth.uid() = sender_id
);
CREATE POLICY "Team members can send" ON team_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 5. KEEP-ALIVE FUNCTION (prevents project pause)
CREATE OR REPLACE FUNCTION keep_alive() RETURNS TEXT AS $$
  SELECT 'alive'::TEXT;
$$ LANGUAGE SQL;

-- 6. CRON JOBS (Optional - run these once if pg_cron is enabled in Supabase)
-- Note: These might fail if pg_cron extension is not enabled.
-- You can enable it in Dashboard -> Database -> Extensions
-- SELECT cron.schedule('cleanup-old-notifications','0 2 * * 0', $$ DELETE FROM in_app_notifications WHERE created_at < NOW() - INTERVAL '60 days' $$);
-- SELECT cron.schedule('cleanup-old-messages','0 3 * * 0', $$ DELETE FROM messages WHERE created_at < NOW() - INTERVAL '30 days' $$);
-- 7. PROFESSIONAL PROFILE ENHANCEMENTS
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS education TEXT,
ADD COLUMN IF NOT EXISTS experience TEXT,
ADD COLUMN IF NOT EXISTS projects_json JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS achievements TEXT;

-- Index for searching (optional)
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON profiles USING gin (skills);

