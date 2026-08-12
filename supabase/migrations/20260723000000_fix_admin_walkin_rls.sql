-- Migration: Add admin walk-in registration RPC that bypasses RLS
-- Date: 2026-07-23

-- Drop & recreate insert policy with admin bypass
DROP POLICY IF EXISTS "Anyone can register for events" ON public.event_registrations;

CREATE POLICY "Anyone can register for events"
  ON public.event_registrations FOR INSERT
  WITH CHECK (
    -- Admins can register anyone (walk-ins for members or guests)
    (
      auth.uid() IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    ) OR
    -- Regular authenticated users can register themselves or as a guest
    (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL)) OR
    -- Unauthenticated guests can only register without a user_id
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- SECURITY DEFINER function: admin walk-in registration (bypasses RLS entirely)
CREATE OR REPLACE FUNCTION public.admin_walkin_register(
  p_event_id       uuid,
  p_user_id        uuid,
  p_full_name      text,
  p_email          text,
  p_payment_method text,
  p_payment_reference text,
  p_payment_status text,
  p_attendance_status text,
  p_qr_code        text,
  p_final_amount   numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can perform walk-in registrations';
  END IF;

  INSERT INTO public.event_registrations (
    event_id,
    user_id,
    full_name,
    email,
    payment_method,
    payment_reference,
    payment_status,
    attendance_status,
    qr_code,
    final_amount
  ) VALUES (
    p_event_id,
    p_user_id,
    p_full_name,
    p_email,
    p_payment_method,
    p_payment_reference,
    p_payment_status,
    p_attendance_status,
    p_qr_code,
    p_final_amount
  );
END;
$$;
