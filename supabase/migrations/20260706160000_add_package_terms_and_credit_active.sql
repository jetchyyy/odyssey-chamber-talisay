-- Migration: Add package terms and conditions column and member credit status column
-- Date: 2026-07-06

-- 1. Add terms_and_conditions to membership_packages
ALTER TABLE public.membership_packages 
ADD COLUMN IF NOT EXISTS terms_and_conditions text NOT NULL DEFAULT '';

-- 2. Add is_active to member_package_credits
ALTER TABLE public.member_package_credits 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
