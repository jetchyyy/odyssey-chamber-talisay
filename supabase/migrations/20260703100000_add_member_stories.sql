-- Migration: Add Member Stories (Testimonials) feature
-- Date: 2026-07-03

CREATE TABLE IF NOT EXISTS public.member_stories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  business_name text NOT NULL DEFAULT '',
  role_title text NOT NULL DEFAULT '',
  story_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.member_stories ENABLE ROW LEVEL SECURITY;

-- Members can see their own stories
CREATE POLICY "Members can view their own stories"
  ON public.member_stories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- Members can insert their own
CREATE POLICY "Members can submit stories"
  ON public.member_stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Members can update their own (only if pending)
CREATE POLICY "Members can update pending stories"
  ON public.member_stories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Admins can do anything
CREATE POLICY "Admins can manage all stories"
  ON public.member_stories FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Public read for approved stories (for homepage)
CREATE POLICY "Anyone can view approved stories"
  ON public.member_stories FOR SELECT
  USING (status = 'approved');
