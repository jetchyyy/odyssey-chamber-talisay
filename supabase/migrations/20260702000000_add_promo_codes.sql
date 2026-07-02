-- Migration: Add promo_codes table and update membership_applications & event_registrations
-- Date: 2026-07-02

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE CHECK (code = upper(code) AND code ~ '^[A-Z0-9_-]+$'),
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  applicable_to text NOT NULL CHECK (applicable_to IN ('membership', 'event', 'all')),
  max_uses integer CHECK (max_uses > 0),
  uses_count integer DEFAULT 0 NOT NULL CHECK (uses_count >= 0),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow anyone to view active, valid promo codes (so guest checkouts can validate codes safely)
CREATE POLICY "Promo codes are viewable by everyone" 
  ON public.promo_codes FOR SELECT 
  USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > now()) 
    AND (max_uses IS NULL OR uses_count < max_uses)
  );

-- Admin manage policy
CREATE POLICY "Promo codes are manageable by admins only" 
  ON public.promo_codes FOR ALL 
  TO authenticated 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Create columns in membership_applications
ALTER TABLE public.membership_applications 
  ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount numeric;

-- Create columns in event_registrations
ALTER TABLE public.event_registrations 
  ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount numeric;

-- Create safe security definer function to increment uses_count bypassing RLS (since standard users can't write to promo_codes)
CREATE OR REPLACE FUNCTION public.increment_promo_uses(p_code_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.promo_codes 
    WHERE id = p_code_id 
      AND is_active = true 
      AND (expires_at IS NULL OR expires_at > now()) 
      AND (max_uses IS NULL OR uses_count < max_uses)
  ) THEN
    UPDATE public.promo_codes
    SET uses_count = uses_count + 1
    WHERE id = p_code_id;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION public.increment_promo_uses(uuid) TO authenticated, anon;
