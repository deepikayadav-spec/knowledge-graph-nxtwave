

# Remove Demo Data and Retention/Recall Logic from Mastery System

## Problem

The mastery system is showing fake data because `useDemoData: true` is hardcoded in `KnowledgeGraphApp.tsx`. This causes the hook to generate random mastery values (69% overall, 31/100 mastered, etc.) instead of reading real data from the database. Additionally, retention decay, retention status badges, recall counts, and stability scores are displayed everywhere, even though we've agreed to use simplified percentage-based mastery only.

## Changes

### 1. `src/components/KnowledgeGraphApp.tsx`
- Change `useDemoData: true` to `useDemoData: false` (line 103)
- Remove the `skillIds` prop passed to `useStudentMastery` (no longer needed for demo generation)

### 2. `src/hooks/useStudentMastery.ts`
- Remove the `useDemoData` option and `skillIds` option entirely
- Remove all imports and usage of `generateDemoMasteryForGraph`
- Remove the demo data fallback (lines 126-128) that fills empty results with fake data
- Remove `computeEffectiveMastery` call -- just use `rawMastery` directly (no retention decay)
- Remove `refreshWithDecay` function
- Remove `getAgingKPs` function
- Simplify: load from DB, set `rawMastery` as the mastery value, no decay computation

### 3. `src/components/mastery/MasteryOverview.tsx`
- Remove the "Aging" and "Expired" summary cards (keep only Overall and Mastered)
- Remove retention badges from each KP row
- Remove "Raw: X% | Ret: Y%" and "N recalls" sub-labels
- Show just: KP name, mastery %, and progress bar
- Sort by mastery % (lowest first) instead of by retention status

### 4. `src/components/panels/NodeDetailPanel.tsx`
- Remove "Retention Factor", "Retention Status", "Stability", and "Successful Recalls" sections
- Keep: mastery %, earned/max points, last reviewed date

### 5. `src/components/graph/GraphNode.tsx`
- Remove retention-based border styles (dashed for aging, dotted for expired)
- Remove retention warning icons (clock, alert triangle)
- Keep mastery-based fill coloring and the mastered glow effect
- Simplify `MasteryData` interface to just `{ mastery: number }` (no `retentionStatus`)

### 6. `src/components/graph/GraphCanvas.tsx`
- Update mastery data passed to GraphNode to use simplified interface (just mastery value)

### 7. `src/lib/mastery/demoData.ts`
- Delete this file entirely (no longer used anywhere)

### 8. `src/lib/mastery/index.ts`
- Remove `export * from './demoData'` line

### 9. `src/hooks/useClassAnalytics.ts`
- Remove `computeEffectiveMastery` usage -- use `rawMastery` directly
- Remove aging/expired KP counts from student summaries

### 10. `src/lib/mastery/calculateMastery.ts`
- Remove `computeEffectiveMastery` and `getKPsNeedingReview` functions if they only serve retention logic

## What Stays
- `rawMastery` calculation (earned/max from real DB data)
- sqrt-weighted rollup for topics/subtopics
- Grade thresholds (A+ through F)
- The `retentionDecay.ts` file can remain in the codebase but won't be called (can be cleaned up later)
- `student_kp_mastery` table schema unchanged

