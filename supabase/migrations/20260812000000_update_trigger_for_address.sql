-- Migration: Update handle_new_user trigger to capture business_address
-- Date: 2026-08-12

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_full_name text;
  user_role text;
  user_agreed boolean;
  user_partner_agreed boolean;
  user_business_address text;
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
    user_business_address := new.raw_user_metadata->>'business_address';
  ELSE
    user_full_name := NULL;
    user_role := 'member';
    user_agreed := false;
    user_partner_agreed := false;
    user_business_address := NULL;
  END IF;

  -- Ensure role is only 'admin' or 'member'
  IF user_role NOT IN ('admin', 'member') THEN
    user_role := 'member';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, membership_status, agreed_to_privacy, agreed_to_partner_sharing, business_address)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    COALESCE(user_full_name, 'New Member'),
    user_role,
    'none',
    user_agreed,
    user_partner_agreed,
    user_business_address
  );
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error details and return new to let auth.users signup succeed
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
