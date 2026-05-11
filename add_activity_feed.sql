-- 1. ACTIVITY POSTS TABLE
CREATE TABLE IF NOT EXISTS activity_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    likes UUID[] DEFAULT '{}', -- Array of user IDs who liked the post
    comments JSONB DEFAULT '[]', -- Array of {user_id, name, text, created_at}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 2. RLS POLICIES FOR ACTIVITY POSTS
ALTER TABLE activity_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activity posts" 
ON activity_posts FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own posts" 
ON activity_posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update/delete their own posts" 
ON activity_posts FOR ALL 
USING (auth.uid() = user_id);

-- 3. STORAGE BUCKET FOR POSTS
-- Note: Ensure 'post_images' bucket is created in Supabase Dashboard and set to Public

-- 4. AUTO-CLEANUP POLICY (To save storage/DB space)
-- This requires pg_cron to be enabled (Supabase -> Settings -> Database -> Extensions -> pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Deletes posts older than 30 days every Sunday at 4 AM
SELECT cron.schedule('cleanup-old-activity', '0 4 * * 0', $$ 
    DELETE FROM activity_posts WHERE created_at < NOW() - INTERVAL '30 days' 
$$);


-- 5. NOTIFICATIONS FOR LIKES (Optional logic)
-- This can be handled via triggers if needed later
