-- Migration: Add Event Pass Packages for Members & Non-Members and Purchase Tracking
-- Date: 2026-07-18

-- 1. Update promo_codes table
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS restricted_to_email text DEFAULT NULL;

-- 2. Update membership_packages table
-- Drop NOT NULL constraint on membership_type
ALTER TABLE public.membership_packages
  ALTER COLUMN membership_type DROP NOT NULL;

-- Recreate check constraint on membership_type to allow NULL
ALTER TABLE public.membership_packages
  DROP CONSTRAINT IF EXISTS membership_packages_membership_type_check;

ALTER TABLE public.membership_packages
  ADD CONSTRAINT membership_packages_membership_type_check 
  CHECK (membership_type IN ('individual', 'sme', 'corporate') OR membership_type IS NULL);

-- Add package_type column
ALTER TABLE public.membership_packages
  ADD COLUMN IF NOT EXISTS package_type text NOT NULL DEFAULT 'membership_bundle'
  CHECK (package_type IN ('membership_bundle', 'member_passes', 'non_member_passes'));

-- Seed new packages
INSERT INTO public.membership_packages (name, description, membership_type, price, included_passes, benefit_type, package_type, terms_and_conditions)
VALUES
  (
    'Event Passes for Existing Members',
    'For existing Chamber members who want to purchase additional event access passes. Valid for 4 events.',
    NULL,
    1000.00,
    4,
    'coffee_connections',
    'member_passes',
    'Exclusive to active members. Passes are non-transferable and can only be used by the account owner.'
  ),
  (
    'Event Passes for Non-Members',
    'For guest attendees who want to join multiple Chamber events without getting a full annual membership. Valid for 4 events.',
    NULL,
    1800.00,
    4,
    'coffee_connections',
    'non_member_passes',
    'Open to non-members. A unique promo code will be generated for your email on approval.'
  )
ON CONFLICT DO NOTHING;

-- Seed the 4 upcoming events from the flyers (checking if already exists to avoid duplicates)
INSERT INTO public.events (title, description, date, time, venue, speaker, price, non_member_price, tag, tag_color, is_featured, is_archived, allow_package_redemption)
SELECT 'Coffee Connection Series 1: Survive: Managing Cash Flow during challenging times',
       'Learn key strategies on managing and optimization cash flow for small businesses during challenging economic times.',
       '2026-07-31',
       '2:00 PM - 5:00 PM',
       'Paseo Ricardo Commercial Center, Rafael Rabaya Rd, City of Talisay, Cebu',
       'Chamber MSME Financial Expert',
       300.00,
       500.00,
       'Coffee Connection',
       'bg-amber-100 text-amber-800',
       false,
       false,
       true
WHERE NOT EXISTS (
  SELECT 1 FROM public.events WHERE title = 'Coffee Connection Series 1: Survive: Managing Cash Flow during challenging times'
);

INSERT INTO public.events (title, description, date, time, venue, speaker, price, non_member_price, tag, tag_color, is_featured, is_archived, allow_package_redemption)
SELECT 'Coffee Connection Series 2: Finding more customers without spending more',
       'A practical workshop on organic growth, customer acquisition strategies, and low-cost marketing tools for businesses.',
       '2026-08-28',
       '2:00 PM - 5:00 PM',
       'Paseo Ricardo Commercial Center, Rafael Rabaya Rd, City of Talisay, Cebu',
       'Chamber Marketing Consultant',
       300.00,
       500.00,
       'Coffee Connection',
       'bg-amber-100 text-amber-800',
       false,
       false,
       true
WHERE NOT EXISTS (
  SELECT 1 FROM public.events WHERE title = 'Coffee Connection Series 2: Finding more customers without spending more'
);

INSERT INTO public.events (title, description, date, time, venue, speaker, price, non_member_price, tag, tag_color, is_featured, is_archived, allow_package_redemption)
SELECT 'Coffee Connection Series 3: Building teams that stay',
       'Retention, corporate culture, and recruitment strategies designed specifically for Cebuano startups, MSMEs, and enterprises.',
       '2026-09-25',
       '2:00 PM - 5:00 PM',
       'Paseo Ricardo Commercial Center, Rafael Rabaya Rd, City of Talisay, Cebu',
       'HR & Leadership Specialist',
       300.00,
       500.00,
       'Coffee Connection',
       'bg-amber-100 text-amber-800',
       false,
       false,
       true
WHERE NOT EXISTS (
  SELECT 1 FROM public.events WHERE title = 'Coffee Connection Series 3: Building teams that stay'
);

INSERT INTO public.events (title, description, date, time, venue, speaker, price, non_member_price, tag, tag_color, is_featured, is_archived, allow_package_redemption)
SELECT 'Talisay Business Expo & Summit',
       'The premier business expo and summit in Talisay City, bringing together hundreds of local entrepreneurs, industries, and government partners.',
       '2026-10-28',
       '9:00 AM - 5:00 PM',
       'Talisay City Sports Complex / Paseo Ricardo Center',
       'Keynote Panelists & Business Leaders',
       300.00,
       500.00,
       'Expo & Summit',
       'bg-green-100 text-green-700',
       true,
       false,
       true
WHERE NOT EXISTS (
  SELECT 1 FROM public.events WHERE title = 'Talisay Business Expo & Summit'
);

-- 3. Create package_purchases table
CREATE TABLE IF NOT EXISTS public.package_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.membership_packages(id) ON DELETE RESTRICT NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  payment_method text NOT NULL CHECK (payment_method IN ('gcash', 'bank_transfer', 'free', 'other')),
  payment_reference text NOT NULL,
  payment_proof_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'free')),
  generated_promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on package_purchases
ALTER TABLE public.package_purchases ENABLE ROW LEVEL SECURITY;

-- Select policy: Users can see their own, admins can see all
DROP POLICY IF EXISTS "Users can view their own package purchases, admins can view all" ON public.package_purchases;
CREATE POLICY "Users can view their own package purchases, admins can view all"
  ON public.package_purchases FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR is_admin()
    OR (auth.uid() IS NULL AND email IS NOT NULL) -- allows email lookup
  );

-- Insert policy: Anyone can submit a purchase
DROP POLICY IF EXISTS "Anyone can create a package purchase" ON public.package_purchases;
CREATE POLICY "Anyone can create a package purchase"
  ON public.package_purchases FOR INSERT
  WITH CHECK (true);

-- Manage policy: Admins only
DROP POLICY IF EXISTS "Package purchases are manageable by admins only" ON public.package_purchases;
CREATE POLICY "Package purchases are manageable by admins only"
  ON public.package_purchases FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. Trigger Function to automatically handle package purchase approvals
CREATE OR REPLACE FUNCTION public.handle_package_purchase_approval()
RETURNS trigger AS $$
DECLARE
  v_pkg_name text;
  v_pkg_type text;
  v_pkg_passes integer;
  v_pkg_benefit text;
  v_promo_code text;
  v_promo_id uuid;
BEGIN
  -- Execute only when status is changed to approved
  IF new.status = 'approved' AND (old.status IS NULL OR old.status <> 'approved') THEN
    
    -- Load package details
    SELECT name, package_type, included_passes, benefit_type
      INTO v_pkg_name, v_pkg_type, v_pkg_passes, v_pkg_benefit
      FROM public.membership_packages
     WHERE id = new.package_id;

    -- Update payment_status to paid if approved
    new.payment_status := CASE WHEN new.payment_method = 'free' THEN 'free' ELSE 'paid' END;

    -- A. For existing member passes, provision credits in member_package_credits
    IF new.user_id IS NOT NULL AND v_pkg_type = 'member_passes' THEN
      -- Create credits for member
      INSERT INTO public.member_package_credits (
        user_id,
        package_name,
        benefit_type,
        total_credits,
        remaining_credits,
        is_active
      ) VALUES (
        new.user_id,
        v_pkg_name,
        v_pkg_benefit,
        v_pkg_passes,
        v_pkg_passes,
        true
      );
    END IF;

    -- B. For non-members, generate a unique promo code
    IF v_pkg_type = 'non_member_passes' AND new.generated_promo_code_id IS NULL THEN
      -- Generate a code pattern e.g. PASS-XXXXXX
      v_promo_code := 'PASS-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));

      -- Create a 100% off event promo code restricted to this email
      INSERT INTO public.promo_codes (
        code,
        discount_type,
        discount_value,
        applicable_to,
        max_uses,
        uses_count,
        restricted_to_email,
        is_active
      ) VALUES (
        v_promo_code,
        'percentage',
        100,
        'event',
        v_pkg_passes,
        0,
        new.email,
        true
      ) RETURNING id INTO v_promo_id;

      -- Store the generated code link
      new.generated_promo_code_id := v_promo_id;
    END IF;

  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on package_purchases
CREATE OR REPLACE TRIGGER on_package_purchase_approved
  BEFORE UPDATE ON public.package_purchases
  FOR EACH ROW EXECUTE PROCEDURE public.handle_package_purchase_approval();

-- 5. Update event_registrations check constraint to allow 'cash' payment method
ALTER TABLE public.event_registrations 
  DROP CONSTRAINT IF EXISTS event_registrations_payment_method_check;

ALTER TABLE public.event_registrations 
  ADD CONSTRAINT event_registrations_payment_method_check 
  CHECK (payment_method IN ('gcash', 'bank_transfer', 'free', 'package', 'cash', 'other'));
