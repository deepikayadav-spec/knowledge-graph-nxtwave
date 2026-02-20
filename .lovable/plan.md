
# Display Min/Max Score on Topic Nodes + Confirm Persistence

## Issue 1: Persistence (Already Working)

After investigation, the groupings **are persisting correctly** in the database. All 51 KPs have their `subtopic_id` set. The `useSkillGrouping` hook has `autoLoad=true`, which calls `loadGroupings()` on mount -- so every time you open the app, it loads the saved groupings from the database. You should NOT need to click "Auto Group" again unless you want to reset/recreate the groupings.

No code changes needed here.

## Issue 2: Show Min/Max on Topic Node Click

When a user clicks a Topic super node on the graph canvas, the `SuperNodeDetailPanel` should display the topic's min score (always 0) and max score (unique question count).

### Changes

**1. `src/components/KnowledgeGraphApp.tsx`**
- Import `loadTopicScoreRanges` and add state for `topicScoreRanges`
- Load score ranges when `currentGraphId` changes (similar to how MasterySidebar does it)
- Pass `topicScoreRanges` to `SuperNodeDetailPanel`

**2. `src/components/panels/SuperNodeDetailPanel.tsx`**
- Accept an optional `scoreRange` prop (of type `TopicScoreRange | undefined`)
- When the super node is a `topic` type and a score range exists, display:
  - Min Score: 0
  - Max Score: (unique question count)
  - Unique Questions: count
- Show this as a small info section between the header and the skill list

**3. Trigger score range calculation**
- After the data is confirmed persisted, run the score range calculation once for the LKG IO New graph so the `topic_score_ranges` table gets populated
- This can be triggered from the existing "Recalculate Ranges" button in the Mastery sidebar, or we auto-calculate when ranges are empty on load

### Technical Details

The `SuperNodeDetailPanel` header section will gain a stats row for topic nodes:

```text
---------------------------------
| [Icon] Topic Name             |
| Topic  ·  12 knowledge points |
| Min: 0  |  Max: 45  |  45 Qs |
---------------------------------
| skill_1                       |
| skill_2                       |
| ...                           |
---------------------------------
```

The score range lookup is simple: find the `TopicScoreRange` where `topicId` matches the super node's underlying topic ID (extracted by stripping the `topic_` prefix from the super node ID).
