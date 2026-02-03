
# Visual Node Grouping System - Implementation Plan

## Overview

This plan implements a teacher-friendly visual grouping system where users can select multiple Knowledge Points (KPs) on the graph canvas to create subtopics, then group subtopics into topics. The hierarchy enables meaningful mastery aggregation at multiple levels.

---

## User Experience Flow

```text
Step 1: Enter Edit Mode
  User clicks "Edit Groups" toggle in the graph header
  
Step 2: Multi-Select KPs  
  Shift+Click on individual nodes to select multiple
  OR drag a lasso rectangle to select a region
  Selected nodes show checkmark overlay
  
Step 3: Create Subtopic
  Click "Create Subtopic" button in floating toolbar
  Enter subtopic name in dialog
  Selected KPs are assigned to this subtopic
  Nodes visually show colored border matching subtopic
  
Step 4: Create Topic (optional)
  In sidebar, select multiple subtopics
  Click "Group into Topic"
  Enter topic name
  Topic becomes the highest-level aggregation unit
  
Step 5: Exit Edit Mode
  Click "Done Editing"
  Groupings are persisted to database
```

---

## Database Schema Changes

### New Table: `skill_subtopics`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| graph_id | uuid | FK to knowledge_graphs |
| name | text | Subtopic display name |
| color | text | Hex color for visual grouping |
| topic_id | uuid (nullable) | FK to skill_topics |
| display_order | integer | For custom ordering |
| created_at | timestamp | Auto-generated |

### New Table: `skill_topics`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| graph_id | uuid | FK to knowledge_graphs |
| name | text | Topic display name |
| color | text | Hex color for visual grouping |
| display_order | integer | For custom ordering |
| created_at | timestamp | Auto-generated |

### Modify Table: `skills`

Add new column:
| Column | Type | Description |
|--------|------|-------------|
| subtopic_id | uuid (nullable) | FK to skill_subtopics |

---

## Architecture

```text
+------------------------------------------+
|              GraphCanvas                  |
|  +------------------------------------+  |
|  |  Edit Mode State                   |  |
|  |  - isEditMode: boolean             |  |
|  |  - selectedNodeIds: Set<string>    |  |
|  |  - lassoRect: {x,y,w,h} | null     |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |  Visual Overlays                   |  |
|  |  - Subtopic border colors          |  |
|  |  - Selection checkmarks            |  |
|  |  - Lasso selection rectangle       |  |
|  +------------------------------------+  |
+------------------------------------------+

+------------------------------------------+
|           Grouping Sidebar                |
|  (replaces/augments MasterySidebar)       |
|  +------------------------------------+  |
|  |  Topic Tree View                   |  |
|  |  - Collapsible topics              |  |
|  |  - Draggable subtopics             |  |
|  |  - KP count per group              |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |  Mastery Aggregation View          |  |
|  |  - Topic mastery (rolled up)       |  |
|  |  - Subtopic mastery                |  |
|  |  - Individual KP mastery           |  |
|  +------------------------------------+  |
+------------------------------------------+
```

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/types/grouping.ts` | TypeScript types for Topic, Subtopic, and grouping state |
| `src/hooks/useSkillGrouping.ts` | CRUD operations for subtopics and topics |
| `src/hooks/useGroupingEditMode.ts` | Multi-select, lasso, and edit mode state |
| `src/components/graph/GroupingToolbar.tsx` | Floating toolbar for create subtopic/topic actions |
| `src/components/graph/LassoSelector.tsx` | SVG rectangle for lasso selection |
| `src/components/graph/SubtopicBorder.tsx` | Visual border/background for grouped nodes |
| `src/components/mastery/HierarchicalMasteryView.tsx` | Topic > Subtopic > KP mastery display |
| `src/lib/mastery/aggregateMastery.ts` | Utility functions for rolling up mastery |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/graph/GraphCanvas.tsx` | Add edit mode, multi-select, lasso, and visual grouping |
| `src/components/graph/GraphNode.tsx` | Add selection checkbox overlay and subtopic color indicator |
| `src/components/KnowledgeGraphApp.tsx` | Add edit mode toggle, pass grouping props |
| `src/components/mastery/MasterySidebar.tsx` | Add new "Groups" tab with hierarchical view |
| `src/components/mastery/MasteryOverview.tsx` | Show grouped mastery when groupings exist |
| `src/hooks/useGraphPersistence.ts` | Include subtopic_id when loading/saving skills |

---

## Detailed Implementation

### Phase 1: Database Schema

Migration SQL:
```sql
-- Create topics table
CREATE TABLE public.skill_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id uuid NOT NULL REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create subtopics table
CREATE TABLE public.skill_subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id uuid NOT NULL REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES skill_topics(id) ON DELETE SET NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#8b5cf6',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Add subtopic reference to skills
ALTER TABLE public.skills 
ADD COLUMN subtopic_id uuid REFERENCES skill_subtopics(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE skill_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_subtopics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on skill_topics" ON skill_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on skill_subtopics" ON skill_subtopics FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_skill_topics_graph ON skill_topics(graph_id);
CREATE INDEX idx_skill_subtopics_graph ON skill_subtopics(graph_id);
CREATE INDEX idx_skills_subtopic ON skills(subtopic_id);
```

---

### Phase 2: Types and Hooks

**src/types/grouping.ts**
```typescript
export interface SkillTopic {
  id: string;
  graphId: string;
  name: string;
  color: string;
  displayOrder: number;
  subtopics?: SkillSubtopic[];
}

export interface SkillSubtopic {
  id: string;
  graphId: string;
  topicId: string | null;
  name: string;
  color: string;
  displayOrder: number;
  skillIds?: string[];
}

export interface GroupingEditState {
  isEditMode: boolean;
  selectedNodeIds: Set<string>;
  lassoStart: { x: number; y: number } | null;
  lassoEnd: { x: number; y: number } | null;
}
```

**src/hooks/useSkillGrouping.ts**
- `loadGroupings(graphId)`: Load all topics and subtopics
- `createSubtopic(graphId, name, color, skillIds)`: Create subtopic and assign skills
- `createTopic(graphId, name, color)`: Create topic
- `assignSubtopicToTopic(subtopicId, topicId)`: Move subtopic under topic
- `assignSkillToSubtopic(skillId, subtopicId)`: Assign individual skill
- `removeSkillFromSubtopic(skillId)`: Unassign skill
- `deleteSubtopic(subtopicId)`: Delete subtopic (skills become ungrouped)
- `deleteTopic(topicId)`: Delete topic (subtopics become ungrouped)
- `updateSubtopic(subtopicId, updates)`: Update name/color
- `updateTopic(topicId, updates)`: Update name/color

**src/hooks/useGroupingEditMode.ts**
- Manages multi-select state
- Handles Shift+Click logic
- Handles lasso rectangle drawing and hit detection
- Provides `toggleNodeSelection`, `selectNodesInRect`, `clearSelection`

---

### Phase 3: Canvas Updates

**GraphCanvas.tsx Changes**
1. Accept new props: `isEditMode`, `selectedNodeIds`, `onNodeSelectionChange`, `subtopics`, `topics`
2. Add keyboard listener for Shift key state
3. Add lasso selection logic in mousedown/mousemove/mouseup
4. Render lasso rectangle SVG overlay
5. Render subtopic visual groups (colored convex hulls or bounding boxes around grouped nodes)

**GraphNode.tsx Changes**
1. Accept new props: `isEditMode`, `isSelected`, `subtopicColor`
2. When in edit mode and node is selected, show checkmark overlay
3. Show subtle colored ring or border when node has a subtopic assigned
4. Modify click handler: in edit mode, toggle selection instead of opening detail panel

**GroupingToolbar.tsx (Floating)**
- Appears when `isEditMode && selectedNodeIds.size > 0`
- Shows: "Create Subtopic from X selected" button
- When clicked, opens dialog for name/color input

---

### Phase 4: Sidebar Integration

**MasterySidebar.tsx Changes**
1. Add new "Groups" tab alongside Log, Upload, Overview
2. When in Groups tab, show hierarchical topic tree
3. Add "Edit Groups" button that toggles canvas edit mode

**HierarchicalMasteryView.tsx (New)**
- Renders collapsible tree: Topic > Subtopic > KP
- Each level shows aggregated mastery percentage
- Topic mastery = weighted average of subtopic masteries
- Subtopic mastery = weighted average of KP masteries
- Clicking on any item expands/collapses or navigates

---

### Phase 5: Mastery Aggregation

**src/lib/mastery/aggregateMastery.ts**
```typescript
// Aggregate mastery for a subtopic
export function calculateSubtopicMastery(
  subtopicId: string,
  skillMastery: Map<string, KPMastery>,
  skillToSubtopic: Map<string, string>
): AggregatedMastery {
  const skills = [...skillToSubtopic.entries()]
    .filter(([_, stId]) => stId === subtopicId)
    .map(([skillId]) => skillId);
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const skillId of skills) {
    const mastery = skillMastery.get(skillId);
    if (mastery) {
      const weight = mastery.maxPoints || 1;
      weightedSum += (mastery.effectiveMastery ?? mastery.rawMastery) * weight;
      totalWeight += weight;
    }
  }
  
  return {
    mastery: totalWeight > 0 ? weightedSum / totalWeight : 0,
    skillCount: skills.length,
    masteredCount: skills.filter(id => {
      const m = skillMastery.get(id);
      return m && (m.effectiveMastery ?? m.rawMastery) >= 0.8;
    }).length,
  };
}

// Aggregate mastery for a topic
export function calculateTopicMastery(
  topicId: string,
  subtopicMastery: Map<string, AggregatedMastery>,
  subtopicToTopic: Map<string, string>
): AggregatedMastery {
  // Similar weighted aggregation over subtopics
}
```

---

### Phase 6: Graph Persistence Updates

**useGraphPersistence.ts Changes**
1. When loading graph, also fetch subtopics and topics
2. When loading skills, include `subtopic_id`
3. When saving graph, preserve subtopic assignments
4. Add methods: `loadGroupings`, `saveGroupings`

---

## Visual Design

### Edit Mode Indicators
- Canvas header shows "Editing Groups" badge
- Nodes show subtle checkbox in top-right corner
- Selected nodes have checkmark + blue highlight
- Cursor changes to crosshair for lasso

### Subtopic Visualization
- Grouped nodes share a subtle colored underlay (rounded rect behind group)
- Node border shows thin colored ring matching subtopic
- Ungrouped nodes have no special indicator

### Hierarchy in Sidebar
```text
[Topic: Loops & Iteration] 85%
  ├─ [Subtopic: Basic Loops] 92%
  │    ├─ for_loop_syntax    100%
  │    ├─ while_loop_basics   88%
  │    └─ loop_counter        90%
  └─ [Subtopic: Loop Patterns] 78%
       ├─ accumulator_pattern  82%
       └─ nested_loops         74%

[Ungrouped] 
  ├─ variable_assignment  95%
  └─ print_output         100%
```

---

## Implementation Order

1. **Database migration** - Add tables and columns
2. **Types and hooks** - `useSkillGrouping`, `useGroupingEditMode`
3. **Canvas multi-select** - Shift+click and lasso
4. **Create subtopic flow** - Dialog and database persistence
5. **Visual grouping on canvas** - Colored borders/backgrounds
6. **Sidebar groups tab** - Hierarchical tree view
7. **Topic creation** - Group subtopics into topics
8. **Mastery aggregation** - Roll up mastery at each level
9. **Persistence integration** - Save/load groupings with graph

---

## Technical Considerations

### Performance
- Use `useMemo` for computing node positions within subtopic groups
- Virtualize the hierarchy tree if many topics/subtopics exist
- Batch database operations when assigning multiple skills

### Edge Cases
- Skill without subtopic: Show in "Ungrouped" section
- Subtopic without topic: Show at root level of hierarchy
- Deleting subtopic: Skills become ungrouped (not deleted)
- Deleting topic: Subtopics become ungrouped (not deleted)

### Accessibility
- Keyboard navigation for multi-select (Shift+Arrow keys)
- Screen reader announcements for selection changes
- Focus management in dialogs

---

## Summary

This implementation provides:
1. Visual multi-select on the graph canvas (Shift+click or lasso)
2. Create subtopics from selected KPs with custom name/color
3. Group subtopics into topics for higher-level organization
4. Aggregated mastery at topic and subtopic levels
5. Collapsible hierarchy view in the mastery sidebar
6. Persistent storage of groupings linked to the graph
