

# Merge New Draft Prose into Current Prompt

## Approach

Combine the best of both prompts: keep the current prompt's production guardrails and domain injection, but restructure using the draft's clearer phase-based explanations.

## What Changes

### `supabase/functions/generate-graph/index.ts` — `buildSystemPrompt(config)`

Replace the system prompt text with a merged version that:

1. **Keeps from current prompt (non-negotiable)**:
   - `DomainConfig` injection (skill catalog, mandatory edges, independent foundational, curriculum sequence, example IPA)
   - 5 consolidation rules with RULE numbering and N/5 formula
   - Skill weight computation (primary 0.6 / secondary 0.4, sum-to-1.0)
   - 8-point quality validation checklist with "FAIL = REDO"
   - Triple self-check (edge ratio, zero-incoming, mandatory edges)
   - Test case handling instructions for PERCEIVE/MONITOR
   - Target metrics (edge density 1.5–2.5, 10%+ reuse, 5–7 depth)

2. **Replaces with draft's prose**:
   - Phase 1 (IPA): Use the draft's detailed PERCEIVE/ENCODE/RETRIEVE/DECIDE/EXECUTE/MONITOR explanations with examples
   - Phase 2 (LTA): Use the draft's knowledge type definitions (declarative/procedural/conditional/strategic) with examples
   - Phase 3 (Normalization): Use the draft's 5 rules (synonym unification, general operators, atomicity, reusability, abstraction consistency) with WRONG/RIGHT examples — then append the current prompt's strict formulas and self-checks
   - Phase 4 (DAG): Use the draft's "WITHOUT X?" rule explanation, direction of knowledge progression, minimum connectivity, transitive reduction, no cycles, and level computation prose
   - Phase 5 (Catalog): New standalone section from draft, merged with current domain-injected catalog
   - Phase 6 (JSON Output): Use the draft's detailed JSON schema examples, merged with current prompt's strict output rules

3. **Structure**: 6 clearly labeled phases instead of the current less-structured format, making it easier to read and maintain

## Files Changed

- `supabase/functions/generate-graph/index.ts` — rewrite `buildSystemPrompt()` body only; `DomainConfig`, `PYTHON_CONFIG`, `WEB_CONFIG`, and all other code unchanged

