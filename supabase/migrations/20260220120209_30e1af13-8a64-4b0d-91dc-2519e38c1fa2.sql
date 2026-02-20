
-- Add new columns to student_attempts for granular independence scoring
ALTER TABLE public.student_attempts 
  ADD COLUMN IF NOT EXISTS solution_viewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_tutor_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_submissions integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS independence_score numeric NOT NULL DEFAULT 1.0;

-- Create topic_score_ranges table
CREATE TABLE IF NOT EXISTS public.topic_score_ranges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  graph_id uuid NOT NULL REFERENCES public.knowledge_graphs(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.skill_topics(id) ON DELETE CASCADE,
  topic_name text NOT NULL,
  min_score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  unique_questions integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(graph_id, topic_id)
);

-- Enable RLS
ALTER TABLE public.topic_score_ranges ENABLE ROW LEVEL SECURITY;

-- Allow all operations (matches existing pattern)
CREATE POLICY "Allow all operations on topic_score_ranges"
  ON public.topic_score_ranges
  FOR ALL
  USING (true)
  WITH CHECK (true);
