-- Create classes table for cohort grouping
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  graph_id UUID NOT NULL REFERENCES public.knowledge_graphs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  teacher_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create policy for classes (public access for now, can be restricted later)
CREATE POLICY "Allow all operations on classes" ON public.classes
  FOR ALL USING (true) WITH CHECK (true);

-- Create class_students table for many-to-many relationship
CREATE TABLE public.class_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Enable RLS on class_students
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

-- Create policy for class_students
CREATE POLICY "Allow all operations on class_students" ON public.class_students
  FOR ALL USING (true) WITH CHECK (true);

-- Create student_attempts table
CREATE TABLE public.student_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  graph_id UUID NOT NULL REFERENCES public.knowledge_graphs(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  student_id TEXT NOT NULL,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  independence_level TEXT NOT NULL CHECK (independence_level IN ('independent', 'lightly_scaffolded', 'heavily_assisted')),
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on student_attempts
ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;

-- Create policy for student_attempts
CREATE POLICY "Allow all operations on student_attempts" ON public.student_attempts
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster queries on student_attempts
CREATE INDEX idx_student_attempts_student ON public.student_attempts(student_id);
CREATE INDEX idx_student_attempts_graph ON public.student_attempts(graph_id);
CREATE INDEX idx_student_attempts_question ON public.student_attempts(question_id);

-- Create student_kp_mastery table
CREATE TABLE public.student_kp_mastery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  graph_id UUID NOT NULL REFERENCES public.knowledge_graphs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  earned_points NUMERIC NOT NULL DEFAULT 0,
  max_points NUMERIC NOT NULL DEFAULT 0,
  raw_mastery NUMERIC NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  stability NUMERIC NOT NULL DEFAULT 1.0,
  retrieval_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(graph_id, student_id, skill_id)
);

-- Enable RLS on student_kp_mastery
ALTER TABLE public.student_kp_mastery ENABLE ROW LEVEL SECURITY;

-- Create policy for student_kp_mastery
CREATE POLICY "Allow all operations on student_kp_mastery" ON public.student_kp_mastery
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX idx_student_kp_mastery_student ON public.student_kp_mastery(student_id);
CREATE INDEX idx_student_kp_mastery_graph ON public.student_kp_mastery(graph_id);
CREATE INDEX idx_student_kp_mastery_skill ON public.student_kp_mastery(skill_id);

-- Add skill_weights column to questions table
ALTER TABLE public.questions ADD COLUMN skill_weights JSONB DEFAULT '{}'::jsonb;