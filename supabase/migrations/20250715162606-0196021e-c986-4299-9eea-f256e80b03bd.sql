-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'coordinator', 'volunteer', 'viewer');

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create children table
CREATE TABLE public.children (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  photo_url TEXT,
  address TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  medical_notes TEXT,
  special_needs TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create program types
CREATE TABLE public.programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default programs
INSERT INTO public.programs (name, description) VALUES
('Education', 'Educational support and activities'),
('Feeding', 'Nutrition and feeding programs'),
('Guardian/F.A.', 'Guardian and Family Assistance programs'),
('Kipawa', 'Kipawa support programs'),
('Empowerment', 'Empowerment and life skills programs'),
('Visits', 'Home and family visits'),
('Alumni', 'Alumni tracking and support');

-- Create child program enrollments
CREATE TABLE public.child_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(child_id, program_id)
);

-- Create activities/records table for tracking program activities
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  outcome TEXT,
  attachments JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visits table
CREATE TABLE public.visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  visit_type TEXT NOT NULL,
  visit_date DATE NOT NULL,
  duration_minutes INTEGER,
  location TEXT,
  purpose TEXT,
  findings TEXT,
  recommendations TEXT,
  next_visit_date DATE,
  visited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create files/documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  category TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE profiles.user_id = $1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for children (all authenticated users can read, coordinators+ can modify)
CREATE POLICY "Authenticated users can view children" ON public.children
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coordinators and admins can insert children" ON public.children
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'coordinator'));

CREATE POLICY "Coordinators and admins can update children" ON public.children
  FOR UPDATE TO authenticated 
  USING (public.get_user_role(auth.uid()) IN ('admin', 'coordinator'));

CREATE POLICY "Admins can delete children" ON public.children
  FOR DELETE TO authenticated 
  USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for programs (read-only for most users)
CREATE POLICY "Authenticated users can view programs" ON public.programs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage programs" ON public.programs
  FOR ALL TO authenticated 
  USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for child_programs
CREATE POLICY "Authenticated users can view child programs" ON public.child_programs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coordinators and admins can manage child programs" ON public.child_programs
  FOR ALL TO authenticated 
  USING (public.get_user_role(auth.uid()) IN ('admin', 'coordinator'));

-- RLS Policies for activities
CREATE POLICY "Authenticated users can view activities" ON public.activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coordinators and admins can manage activities" ON public.activities
  FOR ALL TO authenticated 
  USING (public.get_user_role(auth.uid()) IN ('admin', 'coordinator'));

-- RLS Policies for visits
CREATE POLICY "Authenticated users can view visits" ON public.visits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coordinators and admins can manage visits" ON public.visits
  FOR ALL TO authenticated 
  USING (public.get_user_role(auth.uid()) IN ('admin', 'coordinator'));

-- RLS Policies for documents
CREATE POLICY "Authenticated users can view documents" ON public.documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can upload documents" ON public.documents
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Coordinators and admins can manage documents" ON public.documents
  FOR ALL TO authenticated 
  USING (public.get_user_role(auth.uid()) IN ('admin', 'coordinator'));

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_child_programs_updated_at
  BEFORE UPDATE ON public.child_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visits_updated_at
  BEFORE UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'viewer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('child-photos', 'child-photos', true),
  ('documents', 'documents', false);

-- Storage policies for child photos (public read)
CREATE POLICY "Child photos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'child-photos');

CREATE POLICY "Authenticated users can upload child photos" ON storage.objects
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'child-photos');

CREATE POLICY "Coordinators can update child photos" ON storage.objects
  FOR UPDATE TO authenticated 
  USING (bucket_id = 'child-photos' AND public.get_user_role(auth.uid()) IN ('admin', 'coordinator'));

-- Storage policies for documents (private)
CREATE POLICY "Authenticated users can view documents" ON storage.objects
  FOR SELECT TO authenticated 
  USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Coordinators can manage documents" ON storage.objects
  FOR ALL TO authenticated 
  USING (bucket_id = 'documents' AND public.get_user_role(auth.uid()) IN ('admin', 'coordinator'));