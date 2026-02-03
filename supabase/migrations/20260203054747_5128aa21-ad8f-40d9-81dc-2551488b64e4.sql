-- Create topics table
CREATE TABLE public.skill_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id uuid NOT NULL REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create subtopics table
CREATE TABLE public.skill_subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id uuid NOT NULL REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES skill_topics(id) ON DELETE SET NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#8b5cf6',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Add subtopic reference to skills
ALTER TABLE public.skills 
ADD COLUMN subtopic_id uuid REFERENCES skill_subtopics(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE skill_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_subtopics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on skill_topics" ON skill_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on skill_subtopics" ON skill_subtopics FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_skill_topics_graph ON skill_topics(graph_id);
CREATE INDEX idx_skill_subtopics_graph ON skill_subtopics(graph_id);
CREATE INDEX idx_skill_subtopics_topic ON skill_subtopics(topic_id);
CREATE INDEX idx_skills_subtopic ON skills(subtopic_id);