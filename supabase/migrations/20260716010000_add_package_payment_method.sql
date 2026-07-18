-- Migration: Allow 'package' in event_registrations check constraint
-- Date: 2026-07-16

ALTER TABLE public.event_registrations 
DROP CONSTRAINT IF EXISTS event_registrations_payment_method_check;

ALTER TABLE public.event_registrations 
ADD CONSTRAINT event_registrations_payment_method_check 
CHECK (payment_method IN ('gcash', 'bank_transfer', 'free', 'package', 'other'));
