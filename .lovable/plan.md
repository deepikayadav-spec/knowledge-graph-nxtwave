

# Urgent: Fix Autosave Destroying Edges/Questions + Prevent Future Loss

## Current Situation

- **"LKG IO New"** has 51 skills, **0 edges, 0 questions** in the database
- The 224 questions and all edges were permanently deleted by the autosave
- There is no database backup to restore from -- the data must be re-imported

## Root Cause (lines 90-95 of useGraphPersistence.ts)

Every save (including autosave every 30s) unconditionally deletes ALL edges and questions, then tries to re-insert from the in-memory graph. But the in-memory graph often has 0 edges and 0 questions (they're managed separately), so the delete wipes them and nothing gets re-inserted.

## Fix Plan

### File: `src/hooks/useGraphPersistence.ts`

**Change 1: Conditional deletion (lines 90-95)**

Only delete edges/questions if the in-memory graph actually has replacements:

```typescript
// Always delete skills (they always get re-inserted with subtopic restoration)
const deleteOps = [
  supabase.from('skills').delete().eq('graph_id', existingId),
];

// Only delete edges if graph has edges to re-insert
if (graph.edges.length > 0) {
  deleteOps.push(supabase.from('skill_edges').delete().eq('graph_id', existingId));
}

// Only delete questions if graph has questions to re-insert
if (Object.keys(graph.questionPaths || {}).length > 0) {
  deleteOps.push(supabase.from('questions').delete().eq('graph_id', existingId));
}

await Promise.all(deleteOps);
```

**Change 2: Protect metadata counts (lines 67-74)**

Don't overwrite `total_questions` with 0 when the in-memory graph has no questions:

```typescript
const updatePayload: any = {
  name,
  description: description || null,
  total_skills: skillCount,
};
// Only update total_questions if the in-memory graph actually has questions
if (questionCount > 0) {
  updatePayload.total_questions = questionCount;
}
```

## Summary

- **1 file changed**: `src/hooks/useGraphPersistence.ts`
- **2 changes**: conditional deletion + metadata protection
- **Effect**: Autosave will never again wipe edges/questions from the database
- **Next step**: After this fix, you will need to re-import the 224 questions into "LKG IO New"

