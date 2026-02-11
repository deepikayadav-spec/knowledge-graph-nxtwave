

# AI-Powered Subtopic Generation

## The Problem

Currently, Auto-Group creates a **1:1 mapping** between topics and subtopics (e.g., "Loops" topic has one subtopic also called "Loops" containing all 8 loop-related skills). This makes the Subtopics view identical to the Topics view.

**What you actually want**: Within "Loops", skills should be grouped into meaningful subtopics like:
- "Basic Iteration" (loop_iteration, input_parsing)
- "Loop Patterns" (accumulator_pattern, search_pattern, filter_pattern, transform_pattern)
- "Advanced Loops" (nested_iteration, geometric_pattern_generation, integer_digit_extraction)

## Solution

Enhance the `auto-group-skills` edge function to use AI (via the same Lovable AI gateway already used for graph generation) to intelligently split skills within each topic into meaningful subtopics.

### How It Works

1. **Phase 1 (unchanged)**: Group skills into topics using the deterministic `SKILL_TOPIC_MAP`
2. **Phase 2 (new)**: For each topic with 3+ skills, call AI to suggest subtopic groupings
3. AI receives the topic name and list of skill names/IDs, and returns subtopic clusters
4. Topics with only 1-2 skills keep a single subtopic (no AI call needed)

### AI Prompt Design

For each topic, the AI gets:
```
Topic: "Loops"
Skills: loop_iteration, accumulator_pattern, search_pattern, filter_pattern, 
        transform_pattern, input_parsing, nested_iteration, 
        geometric_pattern_generation, integer_digit_extraction

Group these skills into 2-4 meaningful subtopics within this topic.
Return JSON: { "subtopics": [{ "name": "...", "skill_ids": ["..."] }] }
```

The AI returns clusters, and the function creates the `skill_subtopics` entries accordingly.

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/auto-group-skills/index.ts` | Add AI call (Phase 2) to generate subtopics within each topic. Uses `LOVABLE_API_KEY` and `ai.gateway.lovable.dev` like existing functions. |

No other files need changes -- the existing `useSkillGrouping` hook and `buildSubtopicView` utility already handle multiple subtopics per topic correctly.

## Technical Details

- Uses `google/gemini-2.5-flash` model (fast, cheap, sufficient for classification)
- AI is only called for topics with 3+ skills (smaller groups get a single subtopic matching the topic name)
- All AI calls for different topics run in parallel for speed
- If AI fails for a topic, falls back to a single subtopic (same as current behavior)
- The prompt enforces that every skill must appear in exactly one subtopic and no skill is dropped

### Execution Flow
```
1. Clear existing groupings (already implemented)
2. Group skills by topic using SKILL_TOPIC_MAP (already implemented)
3. Create topic rows in DB (already implemented)
4. NEW: For each topic with 3+ skills, call AI to split into subtopics
5. Create subtopic rows and link skills (modified to use AI clusters)
```

