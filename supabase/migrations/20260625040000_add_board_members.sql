-- Migration: Add board_members table and seed data
-- Date: 2026-06-25

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
