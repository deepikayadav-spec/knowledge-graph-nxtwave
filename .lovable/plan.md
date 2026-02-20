
# Simplify Skill Weights: Equal Weight for All KPs

## What Changes

Remove the primary/secondary skill distinction. Every KP mapped to a question gets **equal weight** = `1 / number_of_skills`.

For example, a question with 3 skills: each skill gets weight `0.333...`

## Files to Modify

### 1. `src/lib/mastery/calculateWeights.ts`
- **Simplify `calculateSkillWeights`**: Remove all primary/secondary logic. Just return `1/skills.length` for each skill.
- **Simplify `mergeWeights`**: Remove the `primarySkills` parameter. If AI weights are provided and valid, use them (normalized). Otherwise, equal split.
- **Remove** `normalizePrimarySkills` function entirely (no longer needed).

### 2. `src/lib/mastery/constants.ts`
- **Remove** `PRIMARY_SKILL_WEIGHT`, `REMAINING_WEIGHT`, and `MAX_PRIMARY_SKILLS` constants.

### 3. `src/lib/mastery/calculateMastery.ts`
- Update `processAttempt` call to `mergeWeights` -- drop the `primarySkills` argument.

### 4. `src/hooks/useRegenerateWeights.ts`
- The regenerate-weights edge function currently identifies primary skills. Update the hook to stop sending/expecting `primarySkills` in the response. Only use `skillWeights` (equal split as default, AI can still override with custom weights if desired).

### 5. `supabase/functions/regenerate-weights/index.ts`
- Simplify the AI prompt: remove instructions about identifying primary skills. Just ask for weight distribution (or skip AI entirely and always use equal weights). Since the user wants equal weights, we can simplify this to just compute equal weights without AI -- or keep AI for cases where custom weights are desired.

### No Database Changes
- The `primary_skills` column on `questions` table stays (no migration needed), it just won't be used in weight calculations anymore. Existing data is harmless.

## Summary
This is a pure simplification. The core change is in `calculateSkillWeights`: instead of 60/40 primary/secondary split, every skill gets `1/n` weight equally.
