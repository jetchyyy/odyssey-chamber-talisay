-- Migration: Add Membership Package Deals & Event Session Tracking
-- Date: 2026-07-02

-- 1. Create member_package_credits table
CREATE TABLE IF NOT EXISTS public.member_package_credits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  package_name text NOT NULL,
  benefit_type text NOT NULL DEFAULT 'coffee_connections',
  total_credits integer NOT NULL DEFAULT 4,
  remaining_credits integer NOT NULL DEFAULT 4 CHECK (remaining_credits >= 0),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.member_package_credits ENABLE ROW LEVEL SECURITY;

-- Create policies for member_package_credits
CREATE POLICY "Users can view their own package credits, admins can view all"
  ON public.member_package_credits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Package credits are manageable by admins only"
  ON public.member_package_credits FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2. Alter membership_applications to add package_availed column
ALTER TABLE public.membership_applications
ADD COLUMN IF NOT EXISTS package_availed text DEFAULT NULL CHECK (package_availed IN ('package_a', 'package_b', 'package_c'));

-- 3. Alter event_registrations to add used_package_credit_id reference
ALTER TABLE public.event_registrations
ADD COLUMN IF NOT EXISTS used_package_credit_id uuid REFERENCES public.member_package_credits(id) ON DELETE SET NULL;

-- 4. Alter events to add allow_package_redemption column
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS allow_package_redemption boolean DEFAULT false NOT NULL;

-- 5. Trigger Function to automatically provision package credits upon membership application approval
CREATE OR REPLACE FUNCTION public.handle_membership_application_approval()
RETURNS trigger AS $$
DECLARE
  v_package_name text;
BEGIN
  -- Check if application was transitioned to approved
  IF new.status = 'approved' AND (old.status IS NULL OR old.status <> 'approved') THEN
    -- If there is a package availed, provision package credits
    IF new.package_availed IS NOT NULL THEN
      v_package_name := CASE new.package_availed
        WHEN 'package_a' THEN 'Package A: Micro & Small Enterprise Membership Package'
        WHEN 'package_b' THEN 'Package B: Medium Enterprise Membership Package'
        WHEN 'package_c' THEN 'Package C: Large Enterprise Membership Package'
        ELSE 'Custom Package Deal'
      END;

      -- Check if credits already exist for this user & package (avoid duplicates)
      IF NOT EXISTS (
        SELECT 1 FROM public.member_package_credits 
        WHERE user_id = new.user_id 
          AND package_name = v_package_name 
          AND benefit_type = 'coffee_connections'
      ) THEN
        INSERT INTO public.member_package_credits (
          user_id,
          package_name,
          benefit_type,
          total_credits,
          remaining_credits
        ) VALUES (
          new.user_id,
          v_package_name,
          'coffee_connections',
          4,
          4
        );
      END IF;
    END IF;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
CREATE OR REPLACE TRIGGER on_membership_application_approved
  AFTER UPDATE ON public.membership_applications
  FOR EACH ROW EXECUTE PROCEDURE public.handle_membership_application_approval();

-- 6. Trigger Function to automatically decrement remaining_credits when a pass is used
CREATE OR REPLACE FUNCTION public.handle_event_registration_package_redeem()
RETURNS trigger AS $$
BEGIN
  IF new.used_package_credit_id IS NOT NULL THEN
    UPDATE public.member_package_credits
    SET remaining_credits = remaining_credits - 1,
        updated_at = now()
    WHERE id = new.used_package_credit_id;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create insert trigger
CREATE OR REPLACE TRIGGER on_event_registration_package_redeem
  AFTER INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE PROCEDURE public.handle_event_registration_package_redeem();

-- 7. Trigger Function to automatically refund package credits if registration is deleted
CREATE OR REPLACE FUNCTION public.handle_event_registration_package_refund()
RETURNS trigger AS $$
BEGIN
  IF old.used_package_credit_id IS NOT NULL THEN
    UPDATE public.member_package_credits
    SET remaining_credits = remaining_credits + 1,
        updated_at = now()
    WHERE id = old.used_package_credit_id;
  END IF;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create delete trigger
CREATE OR REPLACE TRIGGER on_event_registration_package_refund
  AFTER DELETE ON public.event_registrations
  FOR EACH ROW EXECUTE PROCEDURE public.handle_event_registration_package_refund();
