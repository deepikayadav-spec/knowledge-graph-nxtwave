

# Fix Node Click, Auto-Generate Groupings, and Add Edit Mode Toggle

## Issue 1: Node Click Not Opening Detail Panel

The `NodeDetailPanel` only renders when `viewMode === 'skills'` (line 541 of KnowledgeGraphApp). This is correct for the skills view and the click handler logic is sound. The issue is likely that the panel should also open in subtopics/topics view for regular skill nodes (not super nodes). Additionally, if you're testing with the Subtopics or Topics toggle active, no panel shows at all.

**Fix**: Remove the `viewMode === 'skills'` guard from the NodeDetailPanel rendering. Instead, show the panel whenever a regular skill node is selected (not a super node). This way clicking a node always shows its details regardless of view mode.

**File**: `src/components/KnowledgeGraphApp.tsx`
- Change `{selectedNode && viewMode === 'skills' && (` to `{selectedNode && (`
- This restores the click-to-inspect behavior across all view modes

## Issue 2: Auto-Generate Subtopics and Topics from Curriculum

Currently, switching to Subtopics or Topics view shows nothing because no groupings exist in the database. The `SKILL_TOPIC_MAP` in the edge function already maps each skill to a numbered topic, and `CURRICULUM_TOPICS` has the topic names. We should use this to auto-populate groupings when a graph is loaded.

**Approach**: Create a new edge function `auto-group-skills` that:
1. Takes a `graph_id`
2. Reads all skills for that graph
3. Uses the `SKILL_TOPIC_MAP` to assign each skill to a curriculum topic
4. Creates `skill_topics` entries (one per curriculum topic that has skills)
5. Creates `skill_subtopics` entries (one per topic, acting as a single subtopic per topic for now)
6. Updates each skill's `subtopic_id` to link it to the correct subtopic
7. Returns the created groupings

**Add a button** "Auto-Group" in the header (next to the view mode toggle) that calls this function when clicked. This gives the user control over when grouping happens.

**Files to create/modify**:
| File | Changes |
|------|---------|
| `supabase/functions/auto-group-skills/index.ts` | **New** -- Edge function that reads skills and creates topic/subtopic groupings based on SKILL_TOPIC_MAP |
| `src/hooks/useSkillGrouping.ts` | Add `autoGroupSkills(graphId)` method that calls the edge function and reloads groupings |
| `src/components/KnowledgeGraphApp.tsx` | Add "Auto-Group" button near the ViewModeToggle; call `autoGroupSkills` and reload |

## Issue 3: Standalone Edit Mode Toggle

Currently, editing (add/remove nodes, edges) is always available -- there's no guard. The user wants an explicit "Edit" toggle button in the header that controls whether CRUD operations (delete buttons, add prerequisite/dependent buttons) are visible.

**Approach**:
1. Add an `isEditMode` state to `KnowledgeGraphApp` (separate from the grouping edit mode)
2. Add an "Edit" / "Done" toggle button in the header toolbar
3. Only pass `onDeleteNode`, `onAddEdge`, `onRemoveEdge` to `NodeDetailPanel` when edit mode is active
4. Only show the "Add Skill" button when edit mode is active

**Files to modify**:
| File | Changes |
|------|---------|
| `src/components/KnowledgeGraphApp.tsx` | Add `isEditMode` state, "Edit" button in header, conditionally pass CRUD props |

---

## Technical Details

### Edge Function: `auto-group-skills`

```text
POST /auto-group-skills
Body: { graph_id: string }
```

Logic:
1. Fetch all skills for the graph from `skills` table
2. Use a hardcoded `SKILL_TOPIC_MAP` + `CURRICULUM_TOPICS` (same as in generate-graph) to map `skill_id` to topic index
3. For each topic that has at least one skill:
   - Create a `skill_topics` row with the topic name and a color from the palette
   - Create a `skill_subtopics` row linked to that topic (same name, since each topic acts as its own subtopic initially)
   - Update matching skills to set `subtopic_id`
4. Return success

### Header Layout (left to right)
```text
[Logo] Graph Name | [Skills|Subtopics|Topics] [Auto-Group] [Edit/Done] [Add Skill*] [Mastery toggle] [...] [Clear]
```
*Add Skill only visible in edit mode

### Execution Order
1. Fix NodeDetailPanel guard (remove viewMode check)
2. Create `auto-group-skills` edge function
3. Add auto-group button and hook method
4. Add standalone edit mode toggle with conditional CRUD props
