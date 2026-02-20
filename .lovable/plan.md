
# Fix: Preserve Groupings and Score Ranges Across Graph Saves

## Root Cause

The `saveGraph` function in `useGraphPersistence.ts` performs a destructive **delete-all + re-insert** cycle for skills every time the graph is saved (including autosave every 30 seconds):

```
// Line 78-83: This destroys subtopic_id on every save!
await supabase.from('skills').delete().eq('graph_id', existingId);
// ... then re-inserts skills WITHOUT subtopic_id
```

The newly inserted skills have `subtopic_id = null`, which erases the grouping assignments. The topics and subtopics still exist in the database, but no skills point to them anymore. This is why you see empty groupings on reload.

## Fix Strategy

### Change 1: Preserve `subtopic_id` during graph saves (`src/hooks/useGraphPersistence.ts`)

Instead of delete + re-insert (which loses `subtopic_id`), the save function will:

1. Before deleting skills, read the current `skill_id -> subtopic_id` mapping from the database
2. After re-inserting skills, restore the `subtopic_id` values using the saved mapping

This is a minimal change -- just add a query before delete and an update after insert.

Specifically:
- Before line 78: Query `skills` table for `skill_id, subtopic_id` where `subtopic_id IS NOT NULL`
- After skills insert (line 119): Loop through the saved mappings and update each skill's `subtopic_id`

The same pattern applies to the `copyGraph` function (line 362-378) which also drops `subtopic_id` when copying skills.

### Change 2: Preserve score ranges (no code change needed)

The `topic_score_ranges` table already persists correctly. The problem is that when auto-group runs again (because groupings appear lost), it creates NEW topic IDs, making old score ranges orphaned. Once Change 1 is in place, auto-group won't need to be re-run, so score ranges will stay valid.

As an extra safety measure, after auto-group runs, the app already auto-recalculates score ranges (this was added in the previous session). So even if auto-group does run, the ranges will be refreshed.

## Technical Details

### `src/hooks/useGraphPersistence.ts` - `saveGraph` function

Before the delete block (around line 78), add:

```typescript
// Preserve subtopic_id mappings before deleting skills
const { data: existingSkills } = await supabase
  .from('skills')
  .select('skill_id, subtopic_id')
  .eq('graph_id', existingId)
  .not('subtopic_id', 'is', null);

const subtopicMap = new Map<string, string>();
(existingSkills || []).forEach(s => {
  if (s.subtopic_id) subtopicMap.set(s.skill_id, s.subtopic_id);
});
```

After skills insert (around line 119), add:

```typescript
// Restore subtopic_id mappings
if (subtopicMap.size > 0) {
  for (const [skillId, subtopicId] of subtopicMap.entries()) {
    await supabase
      .from('skills')
      .update({ subtopic_id: subtopicId })
      .eq('graph_id', graphId)
      .eq('skill_id', skillId);
  }
}
```

### `src/hooks/useGraphPersistence.ts` - `copyGraph` function

Similarly update the copy function to carry over `subtopic_id` from source skills when inserting into the new graph (by including `subtopic_id` in the insert payload for skills that had a mapping -- though the subtopic IDs would need to be from the source graph's subtopics, which aren't copied. So for copy, we skip this -- subtopic_id is graph-specific).

## Summary

- **1 file changed**: `src/hooks/useGraphPersistence.ts`
- **Root cause**: Delete-and-reinsert pattern wiping `subtopic_id` on every autosave
- **Fix**: Save the mapping before delete, restore after insert
- **Effect**: Groupings and score ranges persist permanently across saves and page reloads
