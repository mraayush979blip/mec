-- ==========================================
-- DEVMATCHUPS: FOREIGN KEY & RLS FIX
-- Run this ONCE in Supabase SQL Editor
-- ==========================================

-- 1. team_listings.creator_id -> profiles
ALTER TABLE public.team_listings DROP CONSTRAINT IF EXISTS team_listings_creator_id_fkey;
ALTER TABLE public.team_listings
ADD CONSTRAINT team_listings_creator_id_fkey
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. teams.creator_id -> profiles
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_creator_id_fkey;
ALTER TABLE public.teams
ADD CONSTRAINT teams_creator_id_fkey
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. join_requests.applicant_id -> profiles
ALTER TABLE public.join_requests DROP CONSTRAINT IF EXISTS join_requests_applicant_id_fkey;
ALTER TABLE public.join_requests
ADD CONSTRAINT join_requests_applicant_id_fkey
FOREIGN KEY (applicant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. team_members.user_id -> profiles
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE public.team_members
ADD CONSTRAINT team_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. Admin can manage external_hackathons (fixes 400 on insert)
DROP POLICY IF EXISTS "Admins can manage external hackathons" ON public.external_hackathons;
CREATE POLICY "Admins can manage external hackathons"
ON public.external_hackathons
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 6. Update join_requests RLS to allow listing-based approval updates
DROP POLICY IF EXISTS "Listing creators can update request status" ON public.join_requests;
CREATE POLICY "Listing creators can update request status"
ON public.join_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.team_listings WHERE id = listing_id AND creator_id = auth.uid())
);
