-- Attach the validation trigger to questions table (if not already attached)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'validate_question_difficulty_trigger'
  ) THEN
    CREATE TRIGGER validate_question_difficulty_trigger
    BEFORE INSERT OR UPDATE ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_question_difficulty();
  END IF;
END;
$$;