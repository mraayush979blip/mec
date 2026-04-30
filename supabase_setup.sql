-- ==========================================
-- 1. ENABLE EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. CREATE TABLES
-- ==========================================

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    full_name TEXT,
    branch TEXT,
    contact_number TEXT,
    skills TEXT[], -- Array of strings e.g., '{"React", "Kotlin", "Figma"}'
    linkedin_url TEXT,
    github_url TEXT,
    whatsapp_no TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- For existing installations:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_no TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url TEXT;

-- EVENTS (Polls / Assignments by Admin)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    know_more_url TEXT,
    type TEXT DEFAULT 'event' CHECK (type IN ('event', 'poll', 'message')),
    is_team_joining_enabled BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    options JSONB, -- For poll options: ["Option A", "Option B"]
    min_team_size INTEGER DEFAULT 4,
    max_team_size INTEGER DEFAULT 6,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- VOTES (For Polls)
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, user_id)
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.votes;
CREATE POLICY "Votes are viewable by everyone" ON public.votes FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can cast votes" ON public.votes;
CREATE POLICY "Users can cast votes" ON public.votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- TEAMS
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    icon_url TEXT,
    requirements TEXT, -- e.g. "Looking for 1 frontend dev and 1 presenter"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Prevent a student from creating more than 1 team per event
    UNIQUE(event_id, creator_id)
);

-- TEAM MEMBERS
CREATE TABLE IF NOT EXISTS public.team_members (
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('creator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (team_id, user_id)
);

-- AUTO-ENROLL CREATOR AS MEMBER
CREATE OR REPLACE FUNCTION public.auto_enroll_team_creator()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (NEW.id, NEW.creator_id, 'creator');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
    AFTER INSERT ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.auto_enroll_team_creator();

-- JOIN REQUESTS
CREATE TABLE IF NOT EXISTS public.join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    applicant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    source TEXT DEFAULT 'application' CHECK (source IN ('application', 'invitation')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- A user can only send 1 request to a specific team
    UNIQUE(team_id, applicant_id)
);

-- GLOBAL BROADCASTS
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. AUTOMATIC PROFILE CREATION & ADMIN ASSIGNMENT
-- ==========================================

-- This function triggers every time a user Signs Up.
-- It checks if the email matches the Admin, and assigns the correct role.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT := 'student';
BEGIN
  -- Automatically make Himanshu the Admin
  IF NEW.email = 'himanshubhiwapurkar@acropolis.in' THEN
    assigned_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, email, role, full_name, whatsapp_no)
  VALUES (NEW.id, NEW.email, assigned_role, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'whatsapp_no');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger that listens to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- EVENTS POLICIES
DROP POLICY IF EXISTS "Events are viewable by everyone." ON public.events;
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage events." ON public.events;
DROP POLICY IF EXISTS "Admins manage events" ON public.events;
CREATE POLICY "Admins manage events" ON public.events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- TEAMS POLICIES
DROP POLICY IF EXISTS "Teams are viewable by everyone." ON public.teams;
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
CREATE POLICY "Teams are viewable by everyone" ON public.teams FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can create teams." ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
CREATE POLICY "Users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update their team." ON public.teams;
DROP POLICY IF EXISTS "Creators can update their team" ON public.teams;
CREATE POLICY "Creators can update their team" ON public.teams FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete their team." ON public.teams;
DROP POLICY IF EXISTS "Creators can delete their team" ON public.teams;
CREATE POLICY "Creators can delete their team" ON public.teams FOR DELETE USING (auth.uid() = creator_id);

-- TEAM MEMBERS POLICIES
DROP POLICY IF EXISTS "Team members are viewable by everyone." ON public.team_members;
DROP POLICY IF EXISTS "Team members are viewable by everyone" ON public.team_members;
CREATE POLICY "Team members are viewable by everyone" ON public.team_members FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage team members." ON public.team_members;
DROP POLICY IF EXISTS "Users can manage team members" ON public.team_members;
CREATE POLICY "Users can manage team members" ON public.team_members FOR ALL USING (auth.role() = 'authenticated');

-- JOIN REQUESTS POLICIES
DROP POLICY IF EXISTS "Join requests are viewable by everyone" ON public.join_requests;
CREATE POLICY "Join requests are viewable by everyone" ON public.join_requests FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own requests" ON public.join_requests;
CREATE POLICY "Users can insert own requests" ON public.join_requests FOR INSERT WITH CHECK (
    auth.uid() = applicant_id -- Case 1: Student is applying to a team
    OR 
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND creator_id = auth.uid()) -- Case 2: Team leader is inviting a student
);

DROP POLICY IF EXISTS "Team creators can update request status" ON public.join_requests;
CREATE POLICY "Team creators can update request status" ON public.join_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND creator_id = auth.uid())
);

-- BROADCASTS POLICIES
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Broadcasts are viewable by everyone" ON public.broadcasts;
CREATE POLICY "Broadcasts are viewable by everyone" ON public.broadcasts FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins manage broadcasts" ON public.broadcasts;
CREATE POLICY "Admins manage broadcasts" ON public.broadcasts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
