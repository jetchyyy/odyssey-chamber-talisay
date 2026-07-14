-- Migration: Add Privacy Settings and Agreement consent
-- Date: 2026-07-14

-- 1. Create privacy_settings table
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT 'Data Privacy Agreement for Talisay Business Summit Registration',
  content text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone can read it (guests and authenticated users)
CREATE POLICY "Privacy policy is viewable by everyone"
  ON public.privacy_settings FOR SELECT
  USING (true);

-- Admin policy: Admins can modify privacy policy
CREATE POLICY "Privacy policy can be modified only by admins"
  ON public.privacy_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Add agreed_to_privacy to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS agreed_to_privacy boolean NOT NULL DEFAULT false;

-- 3. Add agreed_to_privacy to event_registrations
ALTER TABLE public.event_registrations 
ADD COLUMN IF NOT EXISTS agreed_to_privacy boolean NOT NULL DEFAULT false;

-- 4. Insert default privacy policy
INSERT INTO public.privacy_settings (title, content, is_active)
VALUES (
  'Data Privacy Agreement for Talisay Business Summit Registration',
  'The City of Talisay Chamber of Commerce, Trade, & Industry, Inc. (“the Chamber”) values your right to privacy and is committed to protecting the personal information you provide during the membership registration process, in compliance with the Data Privacy Act of 2012 (RA 10173).

By registering your data in this form, you acknowledge and consent to the collection, use, storage, and processing of your personal information as described below:

1. The Chamber may collect the following personal information:
- Full name, address, contact number, and email address
- Company/organization name, business address, and nature of business
- Official designation or position
- Government-issued IDs or business registration documents, as required
- Other relevant details necessary for membership validation and communication

2. Your personal data will be collected and processed for the following purposes:
- Verification of membership eligibility and processing of your application
- Maintenance of the Chamber’s official membership records
- Dissemination of Chamber announcements, programs, events, and activities
- Networking, collaboration, and partnership opportunities among members
- Compliance with reporting requirements of government agencies, if applicable

3. Data Sharing
- The Chamber will not sell, trade, or rent your personal data.
- Data may be shared only with authorized government agencies or partner organizations when required by law or when necessary to carry out Chamber-related programs and services.

4. Data Storage and Retention
- Your personal data will be securely stored in the Chamber''s records, both electronic and physical.
- Retention will be only for as long as necessary to fulfill the purposes stated above or as required by law.

5. As a data subject, you have the following rights under RA 10173:
- Right to be informed how your data is collected and used
- Right to access and request a copy of your personal data
- Right to correct or update your personal information
- Right to object to processing or request deletion of your data, subject to legal obligations
- Right to file a complaint with the National Privacy Commission (NPC)

6. Consent
- By registering your data below, you consent to the collection, use, and processing of your personal information in accordance with this agreement.
- You also affirm that the information provided is true and correct to the best of your knowledge.',
  true
) ON CONFLICT DO NOTHING;

-- 5. Update public.handle_new_user() trigger function to extract agreed_to_privacy
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_full_name text;
  user_role text;
  user_agreed boolean;
BEGIN
  -- Safe extraction of metadata
  IF new.raw_user_metadata IS NOT NULL THEN
    user_full_name := COALESCE(
      new.raw_user_metadata->>'full_name',
      NULLIF(TRIM(CONCAT(new.raw_user_metadata->>'first_name', ' ', new.raw_user_metadata->>'last_name')), '')
    );
    user_role := COALESCE(new.raw_user_metadata->>'role', 'member');
    user_agreed := COALESCE((new.raw_user_metadata->>'agreed_to_privacy')::boolean, false);
  ELSE
    user_full_name := NULL;
    user_role := 'member';
    user_agreed := false;
  END IF;

  -- Ensure role is only 'admin' or 'member'
  IF user_role NOT IN ('admin', 'member') THEN
    user_role := 'member';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, membership_status, agreed_to_privacy)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    COALESCE(user_full_name, 'New Member'),
    user_role,
    'none',
    user_agreed
  );
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error details and return new to let auth.users signup succeed
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
