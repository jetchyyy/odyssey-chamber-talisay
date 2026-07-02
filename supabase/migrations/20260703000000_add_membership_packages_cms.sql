-- Migration: Add Membership Package Deals CMS table
-- Date: 2026-07-03

-- 1. Create membership_packages table for admin-configurable package deals
CREATE TABLE IF NOT EXISTS public.membership_packages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  membership_type text NOT NULL CHECK (membership_type IN ('individual', 'sme', 'corporate')),
  price numeric(10,2) NOT NULL DEFAULT 0,
  included_passes integer NOT NULL DEFAULT 4 CHECK (included_passes >= 0),
  benefit_type text NOT NULL DEFAULT 'coffee_connections',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.membership_packages ENABLE ROW LEVEL SECURITY;

-- Public (authenticated or anon) can read active packages
CREATE POLICY "Anyone can view active membership packages"
  ON public.membership_packages FOR SELECT
  USING (is_active = true OR is_admin());

-- Only admins can create/update/delete
CREATE POLICY "Only admins can manage membership packages"
  ON public.membership_packages FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2. Seed the 3 default package deals
INSERT INTO public.membership_packages (name, description, membership_type, price, included_passes, benefit_type)
VALUES
  (
    'Package A: Small Enterprise',
    'Combines Small annual membership with Coffee Connections event passes at a discounted bundle rate.',
    'individual',
    2900,
    4,
    'coffee_connections'
  ),
  (
    'Package B: Medium Enterprise',
    'Combines Medium annual membership with Coffee Connections event passes at a discounted bundle rate.',
    'sme',
    3800,
    4,
    'coffee_connections'
  ),
  (
    'Package C: Large Enterprise',
    'Combines Large annual membership with Coffee Connections event passes at a discounted bundle rate.',
    'corporate',
    4700,
    4,
    'coffee_connections'
  )
ON CONFLICT DO NOTHING;

-- 3. Add membership_package_id foreign key to membership_applications
--    so approvals can look up the correct credit count from the packages table
ALTER TABLE public.membership_applications
  ADD COLUMN IF NOT EXISTS membership_package_id uuid REFERENCES public.membership_packages(id) ON DELETE SET NULL;

-- 4. Update the approval trigger to read included_passes from the packages table
CREATE OR REPLACE FUNCTION public.handle_membership_application_approval()
RETURNS trigger AS $$
DECLARE
  v_package_name text;
  v_pass_count integer;
BEGIN
  IF new.status = 'approved' AND (old.status IS NULL OR old.status <> 'approved') THEN
    IF new.package_availed IS NOT NULL THEN
      -- If linked to a managed package, read the pass count from the packages table
      IF new.membership_package_id IS NOT NULL THEN
        SELECT name, included_passes
          INTO v_package_name, v_pass_count
          FROM public.membership_packages
         WHERE id = new.membership_package_id;
      ELSE
        -- Fallback for legacy hard-coded values
        v_pass_count := 4;
        v_package_name := CASE new.package_availed
          WHEN 'package_a' THEN 'Package A: Micro & Small Enterprise Membership Package'
          WHEN 'package_b' THEN 'Package B: Medium Enterprise Membership Package'
          WHEN 'package_c' THEN 'Package C: Large Enterprise Membership Package'
          ELSE 'Custom Package Deal'
        END;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM public.member_package_credits
        WHERE user_id = new.user_id
          AND package_name = v_package_name
          AND benefit_type = 'coffee_connections'
      ) THEN
        INSERT INTO public.member_package_credits (
          user_id, package_name, benefit_type, total_credits, remaining_credits
        ) VALUES (
          new.user_id, v_package_name, 'coffee_connections', v_pass_count, v_pass_count
        );
      END IF;
    END IF;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
