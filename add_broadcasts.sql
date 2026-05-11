
-- DEDICATED BROADCASTS TABLE
CREATE TABLE IF NOT EXISTS broadcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active broadcasts
DROP POLICY IF EXISTS "Anyone can view active broadcasts" ON broadcasts;
CREATE POLICY "Anyone can view active broadcasts" 
ON broadcasts FOR SELECT 
USING (is_active = true);

-- Allow admins full control (Service role handles this usually, but for direct SQL editor usage:)
DROP POLICY IF EXISTS "Admins can manage broadcasts" ON broadcasts;
CREATE POLICY "Admins can manage broadcasts" 
ON broadcasts FOR ALL 
USING (true); 
