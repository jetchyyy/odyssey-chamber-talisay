-- Migration: Fix event registrations and storage bucket insert policies for unauthenticated users (guests)
-- Date: 2026-07-06

-- 1. Fix event_registrations table insert policy
DROP POLICY IF EXISTS "Users can register themselves for events" ON public.event_registrations;

CREATE POLICY "Anyone can register for events"
  ON public.event_registrations FOR INSERT
  WITH CHECK (
    -- If user is anonymous, user_id must be null
    (auth.uid() IS NULL AND user_id IS NULL) OR
    -- If user is authenticated, they can register for themselves or as a guest (user_id is null)
    (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL))
  );

-- 2. Fix chamber-assets storage bucket insert policy to allow guest uploads (payment proofs)
DROP POLICY IF EXISTS "Authenticated Insert Access on Chamber Assets" ON storage.objects;

CREATE POLICY "Public Insert Access on Chamber Assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chamber-assets');
