-- Migration: Drop package_availed check constraint from membership_applications
-- Date: 2026-07-16

ALTER TABLE public.membership_applications 
DROP CONSTRAINT IF EXISTS membership_applications_package_availed_check;
