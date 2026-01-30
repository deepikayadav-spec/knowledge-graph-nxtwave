-- Create knowledge_graphs table
CREATE TABLE public.knowledge_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  total_skills INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0
);

-- Create skills table
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES public.knowledge_graphs(id) ON DELETE CASCADE NOT NULL,
  skill_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('foundational', 'core', 'applied', 'advanced')),
  level INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  transferable_contexts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(graph_id, skill_id)
);

-- Create skill_edges table
CREATE TABLE public.skill_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES public.knowledge_graphs(id) ON DELETE CASCADE NOT NULL,
  from_skill TEXT NOT NULL,
  to_skill TEXT NOT NULL,
  relationship_type TEXT DEFAULT 'requires',
  reason TEXT,
  UNIQUE(graph_id, from_skill, to_skill)
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES public.knowledge_graphs(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  primary_skill TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_skills_graph_id ON public.skills(graph_id);
CREATE INDEX idx_skill_edges_graph_id ON public.skill_edges(graph_id);
CREATE INDEX idx_questions_graph_id ON public.questions(graph_id);

-- Enable RLS
ALTER TABLE public.knowledge_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (no auth required for MVP)
CREATE POLICY "Allow all operations on knowledge_graphs" ON public.knowledge_graphs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on skills" ON public.skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on skill_edges" ON public.skill_edges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on questions" ON public.questions FOR ALL USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for knowledge_graphs
CREATE TRIGGER update_knowledge_graphs_updated_at
  BEFORE UPDATE ON public.knowledge_graphs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();