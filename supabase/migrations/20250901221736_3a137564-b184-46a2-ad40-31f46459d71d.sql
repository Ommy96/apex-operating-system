-- Create alumni table for graduated/exited students
CREATE TABLE public.alumni (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  location text,
  graduation_year integer,
  exit_year integer,
  current_status text CHECK (current_status IN ('Working', 'Studying', 'Entrepreneurship', 'Other')),
  short_bio text,
  detailed_story text,
  contact_email text,
  contact_phone text,
  social_link text,
  profile_photo_url text,
  gender text,
  achievements text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;

-- Create policies for alumni table
CREATE POLICY "Everyone can view alumni"
ON public.alumni
FOR SELECT
USING (true);

CREATE POLICY "Admins and management can manage alumni"
ON public.alumni
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'management'::user_role]));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_alumni_updated_at
BEFORE UPDATE ON public.alumni
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add some sample alumni data
INSERT INTO public.alumni (
  full_name, 
  location, 
  graduation_year,
  exit_year,
  current_status, 
  short_bio,
  detailed_story,
  contact_email,
  gender,
  achievements
) VALUES 
(
  'Mary Wanjiku',
  'Nairobi',
  2022,
  2022,
  'Working',
  'Software Developer at Tech Kenya',
  'Mary joined our education program in 2018 and showed exceptional talent in mathematics and sciences. After graduating, she pursued a diploma in Computer Science and now works as a junior software developer at one of Nairobi''s leading tech companies.',
  'mary.wanjiku@email.com',
  'Female',
  'Dean''s List Graduate, Best Student in Mathematics 2022'
),
(
  'John Kamau',
  'Mombasa', 
  2021,
  2021,
  'Entrepreneurship',
  'Founder of Green Agriculture Solutions',
  'John was part of our self-empowerment program and developed a passion for sustainable agriculture. He started his own organic farming business that now supplies vegetables to three major supermarket chains in Mombasa.',
  'john.kamau@greenagriculture.co.ke',
  'Male',
  'Young Entrepreneur Award 2023, Sustainable Business Leader'
),
(
  'Grace Akinyi',
  'Kisumu',
  2023,
  2023,
  'Studying',
  'Medical Student at University of Nairobi',
  'Grace excelled in our academic program and received a full scholarship to study medicine. She is currently in her second year and aspires to become a pediatrician to give back to her community.',
  'grace.akinyi@students.uonbi.ac.ke',
  'Female',
  'Full Scholarship Recipient, Top 5% of Class'
),
(
  'David Mutua',
  'Nakuru',
  2020,
  2020,
  'Working',
  'Teacher at Nakuru Primary School',
  'David was inspired by the educators in our program and decided to become a teacher himself. He completed his teaching diploma and now teaches at a primary school in Nakuru, inspiring the next generation of students.',
  'david.mutua@nakuruprimary.ac.ke',
  'Male',
  'Outstanding New Teacher Award 2022'
);