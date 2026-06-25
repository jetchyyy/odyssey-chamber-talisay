-- Migration: Fix auth.users and auth.identities schema mismatch for imported members
-- Date: 2026-06-25

-- 1. Fix existing manual SQL users who have NULL in GoTrue expected columns
DO $$
DECLARE
  col text;
  columns_to_update text[] := ARRAY[
    'confirmation_token',
    'email_change',
    'email_change_token_new',
    'recovery_token',
    'phone_change',
    'phone_change_token',
    'email_change_token_current',
    'reauthentication_token'
  ];
BEGIN
  FOREACH col IN ARRAY columns_to_update LOOP
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'auth' 
        AND table_name = 'users' 
        AND column_name = col
    ) THEN
      EXECUTE format('
        UPDATE auth.users 
        SET %I = '''' 
        WHERE %I IS NULL
      ', col, col);
    END IF;
  END LOOP;
END $$;

-- 2. Backfill missing auth.identities for existing manually inserted users
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.id,
  json_build_object('sub', u.id::text, 'email', u.email)::jsonb,
  'email',
  u.id::text,
  u.created_at,
  u.updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);

-- 3. Upgrade public.admin_import_member function to populate these columns correctly
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

-- Grant execute access
GRANT EXECUTE ON FUNCTION public.admin_import_member(text, text, text, text, text, text, text, timestamp with time zone) TO authenticated;
