-- Change primary_skill from text to text[] to support multiple primaries (max 2)
-- First add new column
ALTER TABLE questions ADD COLUMN primary_skills text[] DEFAULT '{}';

-- Migrate existing data
UPDATE questions 
SET primary_skills = CASE 
  WHEN primary_skill IS NOT NULL THEN ARRAY[primary_skill]
  ELSE '{}'::text[]
END;

-- Drop old column (after migration)
ALTER TABLE questions DROP COLUMN primary_skill;

-- Add constraint to limit to max 2 primary skills
ALTER TABLE questions ADD CONSTRAINT max_two_primary_skills 
  CHECK (array_length(primary_skills, 1) IS NULL OR array_length(primary_skills, 1) <= 2);

-- Add comment for documentation
COMMENT ON COLUMN questions.primary_skills IS 'Up to 2 primary knowledge points per question. If 1: gets 60%. If 2: each gets 30%.';