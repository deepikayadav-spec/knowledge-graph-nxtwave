-- Add difficulty dimension columns to questions table for weightage multiplier system
-- These columns store the 4 rubric dimensions used to calculate question difficulty

ALTER TABLE public.questions
ADD COLUMN cognitive_complexity INTEGER,
ADD COLUMN task_structure INTEGER,
ADD COLUMN algorithmic_demands INTEGER,
ADD COLUMN scope_integration INTEGER,
ADD COLUMN weightage_multiplier NUMERIC DEFAULT 1.0;

-- Add constraints via triggers instead of CHECK constraints for better compatibility
CREATE OR REPLACE FUNCTION public.validate_question_difficulty()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate cognitive_complexity (1-4)
  IF NEW.cognitive_complexity IS NOT NULL AND (NEW.cognitive_complexity < 1 OR NEW.cognitive_complexity > 4) THEN
    RAISE EXCEPTION 'cognitive_complexity must be between 1 and 4';
  END IF;
  
  -- Validate task_structure (1-3)
  IF NEW.task_structure IS NOT NULL AND (NEW.task_structure < 1 OR NEW.task_structure > 3) THEN
    RAISE EXCEPTION 'task_structure must be between 1 and 3';
  END IF;
  
  -- Validate algorithmic_demands (1-3)
  IF NEW.algorithmic_demands IS NOT NULL AND (NEW.algorithmic_demands < 1 OR NEW.algorithmic_demands > 3) THEN
    RAISE EXCEPTION 'algorithmic_demands must be between 1 and 3';
  END IF;
  
  -- Validate scope_integration (1-3)
  IF NEW.scope_integration IS NOT NULL AND (NEW.scope_integration < 1 OR NEW.scope_integration > 3) THEN
    RAISE EXCEPTION 'scope_integration must be between 1 and 3';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_question_difficulty_trigger
BEFORE INSERT OR UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.validate_question_difficulty();

-- Add comment for documentation
COMMENT ON COLUMN public.questions.cognitive_complexity IS 'Bloom''s taxonomy level (1-4): 1=Remember/Understand, 2=Apply, 3=Analyze, 4=Evaluate/Create';
COMMENT ON COLUMN public.questions.task_structure IS 'Problem definition clarity (1-3): 1=Well-defined, 2=Partially defined, 3=Ill-defined';
COMMENT ON COLUMN public.questions.algorithmic_demands IS 'Efficiency requirements (1-3): 1=Any solution, 2=Efficient solution, 3=Optimal solution';
COMMENT ON COLUMN public.questions.scope_integration IS 'Concept integration (1-3): 1=Single concept, 2=Multiple concepts, 3=System-level';
COMMENT ON COLUMN public.questions.weightage_multiplier IS 'Difficulty multiplier (1.0-3.0) calculated from dimension scores';