-- Migration: Add Partner Data Sharing configuration and checkboxes
-- Date: 2026-07-14

-- 1. Add partner columns to privacy_settings table
ALTER TABLE public.privacy_settings 
ADD COLUMN IF NOT EXISTS partner_name text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS data_sharing_scope text NOT NULL DEFAULT 'none' CHECK (data_sharing_scope IN ('none', 'events_only', 'membership_only', 'both'));

-- 2. Add agreed_to_partner_sharing to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS agreed_to_partner_sharing boolean NOT NULL DEFAULT false;

-- 3. Add agreed_to_partner_sharing to event_registrations
ALTER TABLE public.event_registrations 
ADD COLUMN IF NOT EXISTS agreed_to_partner_sharing boolean NOT NULL DEFAULT false;

-- 4. Update handle_new_user trigger function to capture agreed_to_partner_sharing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_full_name text;
  user_role text;
  user_agreed boolean;
  user_partner_agreed boolean;
BEGIN
  -- Safe extraction of metadata
  IF new.raw_user_metadata IS NOT NULL THEN
    user_full_name := COALESCE(
      new.raw_user_metadata->>'full_name',
      NULLIF(TRIM(CONCAT(new.raw_user_metadata->>'first_name', ' ', new.raw_user_metadata->>'last_name')), '')
    );
    user_role := COALESCE(new.raw_user_metadata->>'role', 'member');
    user_agreed := COALESCE((new.raw_user_metadata->>'agreed_to_privacy')::boolean, false);
    user_partner_agreed := COALESCE((new.raw_user_metadata->>'agreed_to_partner_sharing')::boolean, false);
  ELSE
    user_full_name := NULL;
    user_role := 'member';
    user_agreed := false;
    user_partner_agreed := false;
  END IF;

  -- Ensure role is only 'admin' or 'member'
  IF user_role NOT IN ('admin', 'member') THEN
    user_role := 'member';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, membership_status, agreed_to_privacy, agreed_to_partner_sharing)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    COALESCE(user_full_name, 'New Member'),
    user_role,
    'none',
    user_agreed,
    user_partner_agreed
  );
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error details and return new to let auth.users signup succeed
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
