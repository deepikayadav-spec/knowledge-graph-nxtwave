

# Fix Remaining "Skills" Terminology and Improve Top Bar UI

## Problem 1: "Skills" Still Appears in Multiple Places

From the screenshot, the top-left shows `58 skills . 83 relationships . 891` and other places still use "skill":

| Location | Current Text | Fix |
|----------|-------------|-----|
| `KnowledgeGraphApp.tsx` line 413 | `{stats?.totalNodes} skills` | `{stats?.totalNodes} KPs` |
| `KnowledgeGraphApp.tsx` line 459 | `Add Skill` button | `Add KP` |
| `KnowledgeGraphApp.tsx` line 456 | Comment: `Add Skill Button` | `Add KP Button` |
| `KnowledgeGraphApp.tsx` line 358 | Badge: `Skill Taxonomy` | `KP Taxonomy` |
| `KnowledgeGraphApp.tsx` line 305 | Toast: `orphaned skill(s)` | `orphaned KP(s)` |
| `GraphManagerPanel.tsx` line 164 | `{graph.total_skills} skills` | `{graph.total_skills} KPs` |

## Problem 2: Top Bar Is Cluttered and Hard to Read

Looking at the screenshot, the header crams everything into one row: graph name, stats, view toggle, Auto-Group, Edit, Add Skill, Mastery toggle, class/student selectors, question path, Save/Weights/Levels/Difficulty, Clear -- all in a single 14px-tall bar. This makes it feel cramped and buttons hard to find.

### Proposed Improvements

**Split into two rows:**
- **Row 1 (primary)**: Graph name + autosave indicator, stats (compact), View Mode toggle, Edit/Mastery toggles, graph manager actions (Save/Load/Clear)
- **Row 2 (contextual)**: Only appears when needed -- shows Auto-Group, question path selector, class/student selectors, Add KP (in edit mode), Weights/Levels/Difficulty buttons

**Visual improvements:**
- Group related buttons with subtle separators
- Use a slightly taller header (h-auto with padding instead of fixed h-14)
- Stats line uses proper "KPs" terminology with a cleaner separator
- Contextual row has a slightly different background to distinguish it

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/KnowledgeGraphApp.tsx` | Fix 4 "skill" strings; restructure header into primary row + contextual row; group buttons logically |
| `src/components/panels/GraphManagerPanel.tsx` | Fix `{graph.total_skills} skills` to `{graph.total_skills} KPs` on line 164 |

## Technical Details

### Header Layout Structure

```text
Row 1 (always visible):
[Logo] [Graph Name + Autosave] [Stats: "58 KPs . 83 relationships"]
                    [KP View | Subtopics | Topics]  [Edit] [Mastery toggle]  [Load | Save | Clear]

Row 2 (contextual, only if any content):
[Auto-Group]  [Add KP (if edit mode)]  [Class > Student (if mastery)]  
                    [View Question Path (891)]  [Weights] [Levels] [Difficulty]
```

- Row 2 uses `flex-wrap` to handle overflow gracefully
- Row 2 is hidden when there's nothing contextual to show (no graph loaded)
- Vertical separator divs (`w-px h-5 bg-border`) between button groups for clarity

