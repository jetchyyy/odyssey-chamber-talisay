-- Talisay Chamber of Commerce - Database Setup & Migrations
-- This file contains the complete SQL script to set up your Supabase project database.
-- Paste this script directly into the Supabase SQL Editor and run it.

-- =========================================================================
-- OPTIONAL RESET SECTION
-- If you already ran this script once and want to reset/re-run the whole file,
-- uncomment the lines below (remove the "-- ") and execute it:
-- =========================================================================
-- drop table if exists public.business_directory cascade;
-- drop table if exists public.news cascade;
-- drop table if exists public.event_registrations cascade;
-- drop table if exists public.events cascade;
-- drop table if exists public.membership_applications cascade;
-- drop table if exists public.qr_settings cascade;
-- drop table if exists public.membership_pricing cascade;
-- drop table if exists public.profiles cascade;
-- drop trigger if exists on_auth_user_created on auth.users cascade;
-- drop function if exists public.handle_new_user() cascade;
-- drop function if exists public.is_admin() cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";


-- =========================================================================
-- TABLES DEFINITION
-- =========================================================================

-- 1. Profiles Table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  membership_status text not null default 'none' check (membership_status in ('none', 'pending', 'active', 'expired', 'rejected')),
  membership_type text check (membership_type in ('individual', 'sme', 'corporate', 'enterprise', 'associate')),
  company_name text,
  phone text,
  business_address text,
  business_category text,
  expires_at timestamp with time zone default null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Membership Pricing Table (CMS)
create table public.membership_pricing (
  id uuid default gen_random_uuid() primary key,
  type text not null unique check (type in ('individual', 'sme', 'corporate', 'enterprise', 'associate')),
  name text not null,
  price numeric not null check (price >= 0),
  period text not null default 'yr',
  description text,
  benefits text[] not null default '{}'::text[],
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. QR & Payment Settings Table (CMS)
create table public.qr_settings (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  payment_instructions text,
  qr_code_url text, -- GCash/Bank Transfer QR image url (or standard placeholder)
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Membership Applications Table
create table public.membership_applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  membership_type text not null,
  company_name text,
  business_category text,
  phone text,
  business_address text,
  payment_method text not null check (payment_method in ('gcash', 'bank_transfer', 'cash', 'other')),
  payment_reference text not null,
  payment_proof_url text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'approved', 'rejected')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Events Table (CMS)
create table public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  date date not null,
  time text not null,
  venue text not null,
  speaker text not null,
  image_url text,
  capacity integer,
  price numeric default 0 not null check (price >= 0), -- Member Price (0 = Free)
  non_member_price numeric default 0 not null check (non_member_price >= 0), -- Non-Member Price (0 = Free)
  tag text not null default 'Event',
  tag_color text not null default 'bg-green-100 text-green-700',
  is_featured boolean default false not null,
  is_archived boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Event Registrations Table
create table public.event_registrations (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade,
  full_name text not null,
  email text not null,
  payment_method text check (payment_method in ('gcash', 'bank_transfer', 'free', 'other')),
  payment_reference text,
  payment_proof_url text,
  payment_status text not null default 'free' check (payment_status in ('free', 'pending', 'paid', 'failed')),
  attendance_status text not null default 'registered' check (attendance_status in ('registered', 'attended', 'absent')),
  qr_code text not null unique, -- Generated unique check-in ID (e.g. EVT-XXXXXX)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. News Table (CMS)
create table public.news (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  summary text not null,
  content text not null,
  image_url text,
  images text[] default '{}'::text[],
  category text not null,
  read_time text default '3 min' not null,
  author text not null default 'Chamber Admin',
  published_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Business Directory Table (CMS / Member Listings)
create table public.business_directory (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  business_name text not null,
  description text not null,
  logo_url text,
  contact_email text,
  contact_phone text,
  website_url text,
  category text not null,
  address text not null,
  is_featured boolean default false not null,
  is_verified boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- SECURITY DEFINER HELPER FUNCTION FOR ADMIN CHECK
-- =========================================================================

-- Avoids recursion in policies by querying the profiles table with bypassrls (postgres) credentials
create or replace function public.is_admin()
returns boolean security definer set search_path = public as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql;

-- =========================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.membership_pricing enable row level security;
alter table public.qr_settings enable row level security;
alter table public.membership_applications enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.news enable row level security;
alter table public.business_directory enable row level security;

-- 1. Profiles Policies
create policy "Profiles are viewable by owner or admin"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or is_admin());

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id and role = 'member' and membership_status = 'none');

create policy "Profiles can be updated by owners or admins"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or is_admin())
  with check (auth.uid() = id or is_admin());

create policy "Profiles can be deleted only by admins"
  on public.profiles for delete
  to authenticated
  using (is_admin());

-- 2. Membership Pricing Policies
create policy "Pricing is viewable by everyone"
  on public.membership_pricing for select
  using (true);

create policy "Pricing is manageable by admins only"
  on public.membership_pricing for all
  to authenticated
  using (is_admin());

-- 3. QR Settings Policies
create policy "QR settings are viewable by everyone"
  on public.qr_settings for select
  using (true);

create policy "QR settings are manageable by admins only"
  on public.qr_settings for all
  to authenticated
  using (is_admin());

-- 4. Membership Applications Policies
create policy "Users can view their own applications, admins can view all"
  on public.membership_applications for select
  to authenticated
  using (auth.uid() = user_id or is_admin());

create policy "Users can insert their own application"
  on public.membership_applications for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Applications are manageable by admins only"
  on public.membership_applications for update
  to authenticated
  using (is_admin());

create policy "Applications can be deleted by admins only"
  on public.membership_applications for delete
  to authenticated
  using (is_admin());

-- 5. Events Policies
create policy "Events are viewable by everyone"
  on public.events for select
  using (true);

create policy "Events are manageable by admins only"
  on public.events for all
  to authenticated
  using (is_admin());

-- 6. Event Registrations Policies
create policy "Users can view their own registrations, admins can view all"
  on public.event_registrations for select
  using (auth.uid() = user_id or is_admin());

create policy "Users can register themselves for events"
  on public.event_registrations for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Event registrations are manageable by admins only"
  on public.event_registrations for update
  to authenticated
  using (is_admin());

create policy "Event registrations can be deleted by admins only"
  on public.event_registrations for delete
  to authenticated
  using (is_admin());

-- 7. News Policies
create policy "News is viewable by everyone"
  on public.news for select
  using (true);

create policy "News is manageable by admins only"
  on public.news for all
  to authenticated
  using (is_admin());

-- 8. Business Directory Policies
create policy "Directory is viewable by everyone"
  on public.business_directory for select
  using (true);

create policy "Members can create directory listings"
  on public.business_directory for insert
  to authenticated
  with check (auth.uid() = user_id or is_admin());

create policy "Owners or admins can update directory listings"
  on public.business_directory for update
  to authenticated
  using (auth.uid() = user_id or is_admin());

create policy "Owners or admins can delete directory listings"
  on public.business_directory for delete
  to authenticated
  using (auth.uid() = user_id or is_admin());


-- =========================================================================
-- PROFILE GENERATING TRIGGER
-- =========================================================================

-- Trigger to create a profile automatically when a user signs up via auth
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_full_name text;
  user_role text;
begin
  -- Safe extraction of metadata
  if new.raw_user_metadata is not null then
    user_full_name := coalesce(
      new.raw_user_metadata->>'full_name',
      nullif(trim(concat(new.raw_user_metadata->>'first_name', ' ', new.raw_user_metadata->>'last_name')), '')
    );
    user_role := coalesce(new.raw_user_metadata->>'role', 'member');
  else
    user_full_name := null;
    user_role := 'member';
  end if;

  -- Ensure role is only 'admin' or 'member'
  if user_role not in ('admin', 'member') then
    user_role := 'member';
  end if;

  insert into public.profiles (id, email, full_name, role, membership_status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(user_full_name, 'New Member'),
    user_role,
    'none'
  );
  return new;
exception
  when others then
    -- Log error details and return new to let auth.users signup succeed
    raise warning 'Error in handle_new_user trigger: %', SQLERRM;
    return new;
end;
$$ language plpgsql security definer set search_path = public;


create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =========================================================================
-- SEED DATA
-- =========================================================================

-- 1. Seed Membership Pricing
insert into public.membership_pricing (type, name, price, period, description, benefits) values
('individual', 'Small', 1500, 'yr', 'For solo entrepreneurs starting their journey.', array['Networking access', 'Event invitations', 'Member directory listing']),
('sme', 'Medium', 5000, 'yr', 'Most popular for growing small and medium businesses.', array['All Small benefits', 'Business promotion', 'Training & seminars access', 'Priority support']),
('corporate', 'Large', 15000, 'yr', 'For established corporations seeking maximum visibility.', array['All Medium benefits', 'Board meeting access', 'Co-branding rights', 'VIP event seating'])
on conflict (type) do nothing;

-- 2. Seed QR & Payment Settings
insert into public.qr_settings (name, description, payment_instructions, qr_code_url) values
('GCash Payment', 'Pay via GCash transfer to the official Chamber merchant account.', 'Send your payment to GCash account: 0912-345-6789 (John D. / Talisay Chamber Officer). Make sure to take a screenshot and enter the Transaction reference number below.', 'https://api.qrserver.com/v1/create-qr-code/?data=GCash_Talisay_Chamber_09123456789&size=200x200'),
('Bank Transfer (BDO)', 'Direct deposit to BDO (Banco de Oro) account.', 'Transfer to BDO Account No: 00123-4567-8901 (Talisay Chamber of Commerce Inc). Take a screenshot of the receipt and input the Transaction ID or Reference number below.', 'https://api.qrserver.com/v1/create-qr-code/?data=Bank_BDO_Account_0012345678901&size=200x200');

-- 3. Seed Events
insert into public.events (title, description, date, time, venue, speaker, price, tag, tag_color, is_featured, image_url) values
('Talisay Business Summit 2026', 'A premier gathering of business leaders, entrepreneurs, and policymakers discussing the future of commerce in Talisay. Topic: Accelerating Digital Livelihood in Talisay.', '2026-06-20', '8:00 AM - 5:00 PM', 'Talisay City Hall Auditorium', 'Hon. Gerald Anthony Gullas Jr. (Mayor)', 500, 'Summit', 'bg-gold/15 text-amber-800 border border-gold/25', true, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=900&auto=format&fit=crop'),
('SME Financing & Investment Forum', 'Learn about capital funding, small business loans, investment models, and grant opportunities backed by DTI and national institutions.', '2026-07-05', '1:00 PM - 6:00 PM', 'Cityland Commercial Center', 'DTI Regional Director & Bank Officers', 0, 'Forum', 'bg-green-100 text-green-700', false, 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=600&auto=format&fit=crop'),
('Annual Trade Expo & Bazaar', 'A 3-day exhibition event showcasing local Talisay manufacturers, retail companies, food startups, and service providers to the regional market.', '2026-08-12', '9:00 AM - 9:00 PM', 'Talisay Sports Complex', 'Various Local Industry Leaders', 200, 'Expo', 'bg-amber-100 text-amber-700', false, 'https://images.unsplash.com/photo-1473091534298-04dcbce3278c?q=80&w=600&auto=format&fit=crop');

-- 4. Seed News
insert into public.news (title, summary, content, category, read_time, image_url) values
('Chamber signs MOU with DTI Region VII for SME development', 'A landmark agreement to accelerate small business growth and livelihood programs across Talisay, benefiting over 300 micro-enterprises.', 'The City of Talisay Chamber of Commerce, Trade and Industry Inc. officially signed a Memorandum of Understanding (MOU) with the Department of Trade and Industry (DTI) Region VII. This partnership aims to execute high-impact training seminars, improve funding channels, and distribute starter kits to over 300 local micro, small, and medium enterprises (MSMEs). The program is scheduled to launch late June 2026.', 'Partnership', '3 min', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=700&auto=format&fit=crop'),
('Talisay ranks among Cebu''s top 5 business-friendly cities', 'Improved ease-of-doing-business scores reflect years of Chamber advocacy work with local government units.', 'A recent evaluation of economic competitiveness in Cebu Province placed Talisay City in the top 5 most business-friendly cities. The ranking highlights rapid digitizations of permit applications, tax concessions for green businesses, and infrastructure upgrades. Chamber President praised the LGU for its active partnership in streamlining regulatory processes.', 'Economic News', '4 min', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=700&auto=format&fit=crop'),
('38 new businesses join at the latest member orientation', 'The newest batch spans retail, healthcare, logistics, and services, bringing the total membership to 538.', 'The Talisay Chamber welcomed 38 new companies at the second-quarter general membership orientation. New members range from tech startups to local health centers, strengthening our local commerce ecosystem. The Chamber now supports a total network of 538 registered entities.', 'Membership', '2 min', 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=700&auto=format&fit=crop');

-- 5. Seed Business Directory
insert into public.business_directory (business_name, description, contact_email, contact_phone, website_url, category, address, is_featured, is_verified) values
('Santos Trading Co.', 'A premier retail trading distributor offering local goods and household items in Talisay.', 'info@santostrading.com', '(032) 234-5678', 'santostrading.com', 'Retail', 'Poblacion, Talisay City', true, true),
('CR Construction & Dev', 'Residential and commercial developers specializing in modern architectural designs and durable buildings.', 'projects@crconstruct.com', '(032) 456-7890', 'crconstruct.com', 'Construction', 'Lawaan I, Talisay City', false, true),
('Graceland Restaurant Group', 'Serving authentic Cebuano cuisine and catering services for events, corporate parties, and families.', 'hello@graceland.ph', '(032) 345-6789', 'graceland.ph', 'Food & Beverage', 'Tabunok, Talisay City', false, true),
('Cruz & Reyes Law', 'Full-service legal firm specializing in business litigation, labor laws, and corporate filing.', 'legal@cruzreyes.com', '(032) 567-8901', 'cruzreyes.com', 'Professional Services', 'Bulacao, Talisay City', false, true),
('Talisay Medical Center', 'Comprehensive healthcare facility offering general medicine, laboratory tests, and specialized clinics.', 'admin@talisaymed.com', '(032) 678-9012', 'talisaymed.com', 'Healthcare', 'San Isidro, Talisay City', false, true),
('Visayas Tech Solutions', 'Custom software development, network setups, IT consulting, and digital marketing services.', 'contact@visayastech.com', '(032) 789-0123', 'visayastech.com', 'IT & Tech', 'Dumlog, Talisay City', true, true),
('Cebu South Logistics', 'Fast and secure shipping, warehousing, and inventory fulfillment services for Cebu businesses.', 'operations@cebusouth.ph', '(032) 890-1234', 'cebusouth.ph', 'Logistics', 'Tank, Talisay City', false, true),
('Green Earth Agri-Farm', 'Sustainable farm producing fresh organic vegetables, poultry, and farming consulting services.', 'farm@greenearth.ph', '(032) 901-2345', 'greenearth.ph', 'Agriculture', 'Camp 4, Talisay City', false, true);


-- =========================================================================
-- HOW TO PROMOTE A USER TO ADMIN:
-- Run this query substituting your signed-up user''s email:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';
-- =========================================================================

-- =========================================================================
-- STORAGE BUCKETS & POLICIES FOR UPLOADS
-- =========================================================================

-- Insert the public bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chamber-assets', 
  'chamber-assets', 
  true, 
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access to objects in chamber-assets
CREATE POLICY "Public Read Access on Chamber Assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chamber-assets');

-- Allow authenticated users to upload objects to chamber-assets
CREATE POLICY "Authenticated Insert Access on Chamber Assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chamber-assets');

-- Allow authenticated users to update/overwrite objects in chamber-assets they own
CREATE POLICY "Authenticated Update Access on Chamber Assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  WITH CHECK (bucket_id = 'chamber-assets' AND (auth.uid() = owner OR is_admin()));

-- Allow authenticated users to delete objects in chamber-assets they own
CREATE POLICY "Authenticated Delete Access on Chamber Assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chamber-assets' AND (auth.uid() = owner OR is_admin()));

-- Migration: Add non-member price column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS non_member_price numeric default 0 not null check (non_member_price >= 0);

-- Migration: Add is_archived column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_archived boolean default false not null;

-- Migration: Add pending_changes and approval_status columns to business_directory table
ALTER TABLE public.business_directory ADD COLUMN IF NOT EXISTS pending_changes jsonb default null;
ALTER TABLE public.business_directory ADD COLUMN IF NOT EXISTS approval_status text default 'approved' check (approval_status in ('approved', 'pending_approval'));

-- Migration: Add user_id and status columns to news table and update RLS policies
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved' CHECK (status in ('pending', 'approved', 'rejected'));

DROP POLICY IF EXISTS "News is viewable by everyone" ON public.news;
DROP POLICY IF EXISTS "News is manageable by admins only" ON public.news;

CREATE POLICY "Viewable approved news by everyone, pending/rejected by owner or admin"
  ON public.news FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR is_admin());

CREATE POLICY "Members can submit pending news, admins can insert any"
  ON public.news FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id AND status = 'pending') OR is_admin());

CREATE POLICY "Members can update their pending news, admins can update any"
  ON public.news FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id AND status = 'pending') OR is_admin())
  WITH CHECK ((auth.uid() = user_id AND status = 'pending') OR is_admin());

CREATE POLICY "Members can delete their pending news, admins can delete any"
  ON public.news FOR DELETE
  TO authenticated
  USING ((auth.uid() = user_id AND status = 'pending') OR is_admin());


-- Migration: Add invoice_number column to event_registrations table
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS invoice_number text DEFAULT null;

-- Migration: Add invoice_number column to membership_applications table
ALTER TABLE public.membership_applications ADD COLUMN IF NOT EXISTS invoice_number text DEFAULT null;

-- Migration: Add payment_proof_url column to membership_applications and event_registrations table
ALTER TABLE public.membership_applications ADD COLUMN IF NOT EXISTS payment_proof_url text DEFAULT null;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS payment_proof_url text DEFAULT null;


-- Enable pgcrypto for password hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Migration: Add admin_import_member RPC function
CREATE OR REPLACE FUNCTION public.admin_import_member(
  p_email text,
  p_password text,
  p_full_name text,
  p_company_name text,
  p_membership_type text,
  p_phone text,
  p_business_address text,
  p_expires_at timestamp with time zone
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
BEGIN
  -- Only allow execution by admins
  IF auth.uid() IS NULL OR COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), '') <> 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only admins can import members.';
  END IF;

  -- Check if user already exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email % already exists.', p_email;
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_password := crypt(p_password, gen_salt('bf', 10));

  -- Insert into auth.users with all expected standard columns populated
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    phone_change,
    phone_change_token,
    email_change_token_current,
    reauthentication_token,
    phone
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    v_encrypted_password,
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    json_build_object('full_name', p_full_name, 'company_name', p_company_name, 'role', 'member')::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    nullif(p_phone, '')
  );

  -- Insert corresponding identity link
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    json_build_object('sub', v_user_id::text, 'email', p_email)::jsonb,
    'email',
    v_user_id::text,
    now(),
    now()
  );

  -- Create or update profiles table row
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      membership_status,
      membership_type,
      company_name,
      phone,
      business_address,
      expires_at
    ) VALUES (
      v_user_id,
      p_email,
      coalesce(p_full_name, 'New Member'),
      'member',
      'active',
      p_membership_type,
      nullif(p_company_name, ''),
      nullif(p_phone, ''),
      nullif(p_business_address, ''),
      p_expires_at
    );
  ELSE
    UPDATE public.profiles
    SET 
      membership_status = 'active',
      membership_type = p_membership_type,
      company_name = nullif(p_company_name, ''),
      phone = nullif(p_phone, ''),
      business_address = nullif(p_business_address, ''),
      expires_at = p_expires_at
    WHERE id = v_user_id;
  END IF;

  -- Create directory entry if company is provided
  IF p_company_name IS NOT NULL AND p_company_name <> '' THEN
    INSERT INTO public.business_directory (
      user_id,
      business_name,
      description,
      contact_email,
      contact_phone,
      category,
      address,
      is_verified,
      is_featured,
      approval_status,
      pending_changes
    ) VALUES (
      v_user_id,
      p_company_name,
      concat('Registered Chamber Member business specializing in ', coalesce(p_membership_type, 'retail'), '.'),
      p_email,
      nullif(p_phone, ''),
      'Retail',
      coalesce(nullif(p_business_address, ''), 'Talisay City'),
      true,
      false,
      'approved',
      null
    );
  END IF;

  RETURN v_user_id;
END;
$$;

-- Grant execute to authenticated users (the function itself enforces admin check)
GRANT EXECUTE ON FUNCTION public.admin_import_member(text, text, text, text, text, text, text, timestamp with time zone) TO authenticated;


-- Migration: Add board_members table and seed data
CREATE TABLE IF NOT EXISTS public.board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position text NOT NULL,
  rank integer NOT NULL DEFAULT 100,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow anyone to view board members
CREATE POLICY "Board members are viewable by everyone" 
  ON public.board_members FOR SELECT USING (true);

-- Insert/Update/Delete policy: Restrict to admins only
CREATE POLICY "Board members can be inserted by admins only" 
  ON public.board_members FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Board members can be updated by admins only" 
  ON public.board_members FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Board members can be deleted by admins only" 
  ON public.board_members FOR DELETE USING (public.is_admin());

-- Seed data
INSERT INTO public.board_members (name, position, rank, image_url) VALUES
('Carl Cabusas', 'President', 1, '/Carl Cabusas - President.png'),
('Rey Nerius Caluoy', 'VP External', 2, '/Rey Nerius - VP External.jpg'),
('Lendice Cal', 'VP Internal', 3, '/Lendice Marie Cal - VP Internal.jpg'),
('Carlo Lopez', 'VP External', 4, NULL),
('Kenneith L. Ngosiok', 'Treasurer', 5, '/Kenneith Ngosiok - Treasurer.jpg'),
('Julius Reyes Abarita', 'Secretary', 6, '/Julius Reyes - Secretary.jpg'),
('Patricia Farrarons', 'Board of Directors', 10, NULL),
('Angel Caesar Farrarons', 'Board of Directors', 11, NULL),
('Architect Alfred Andrew Tan', 'Board of Directors', 12, NULL),
('Joseph Roxas', 'Board of Directors', 13, NULL),
('Kristine Kwan', 'Board of Directors', 14, NULL),
('Eduardo Empelis', 'Board of Directors', 15, NULL),
('Reimer Neil G. Bonghanoy', 'Board of Directors', 16, NULL),
('Dr. Arnel Merton', 'Board of Directors', 17, NULL),
('Vanessa Joy Arcenal', 'Board of Directors', 18, NULL)
ON CONFLICT (id) DO NOTHING;


-- Migration: Add autobiography column to board_members table
ALTER TABLE public.board_members ADD COLUMN IF NOT EXISTS autobiography text;

-- Migration: Add Privacy Settings and Agreement consent
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

-- Migration: Add Partner Data Sharing configuration and checkboxes
-- Date: 2026-07-14

-- 1. Add partner columns to privacy_settings table
ALTER TABLE public.privacy_settings 
ADD COLUMN IF NOT EXISTS partner_name text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS data_sharing_scope text NOT NULL DEFAULT 'none' CHECK (data_sharing_scope IN ('none', 'events_only', 'membership_only', 'both'));

-- 2. Add agreed_to_partner_sharing to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS agreed_to_partner_sharing boolean NOT NULL DEFAULT false;

-- 3. Add agreed_to_partner_sharing to event_registrations
ALTER TABLE public.event_registrations 
ADD COLUMN IF NOT EXISTS agreed_to_partner_sharing boolean NOT NULL DEFAULT false;

-- 4. Update handle_new_user trigger function to capture agreed_to_partner_sharing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_full_name text;
  user_role text;
  user_agreed boolean;
  user_partner_agreed boolean;
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
  ELSE
    user_full_name := NULL;
    user_role := 'member';
    user_agreed := false;
    user_partner_agreed := false;
  END IF;

  -- Ensure role is only 'admin' or 'member'
  IF user_role NOT IN ('admin', 'member') THEN
    user_role := 'member';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, membership_status, agreed_to_privacy, agreed_to_partner_sharing)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    COALESCE(user_full_name, 'New Member'),
    user_role,
    'none',
    user_agreed,
    user_partner_agreed
  );
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error details and return new to let auth.users signup succeed
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;



