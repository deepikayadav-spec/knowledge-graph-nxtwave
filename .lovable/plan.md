
# Per-Student Mastery Display System

## Overview

This plan implements student-specific mastery visualization throughout the application. When a teacher selects a student from the dropdown, all mastery displays (graph nodes, sidebar hierarchy, and node details) will reflect that specific student's mastery data.

---

## Current State Analysis

The system already tracks per-student mastery in the database (`student_kp_mastery` table with unique constraint on `graph_id, student_id, skill_id`). However, the UI doesn't fully leverage this:

- The **HierarchicalMasteryView** receives `skillMastery` from `useStudentMastery` but only when a student is selected
- The **GraphNode** component doesn't visualize mastery levels
- The **NodeDetailPanel** doesn't show student-specific mastery when viewing a skill

---

## User Flow

```text
1. Teacher enables Mastery Mode
2. Teacher selects a Class from dropdown
3. Teacher selects a Student from dropdown
   → Graph nodes update to show that student's mastery (via opacity/color)
   → Sidebar hierarchy shows that student's aggregated mastery
4. Teacher clicks on a Knowledge Point node
   → Detail panel shows that student's mastery for that specific KP
   → Includes: raw mastery, retention factor, effective mastery, attempt count
5. Sidebar "Groups" tab shows rolled-up mastery:
   → Each KP shows student's effective mastery percentage
   → Each Subtopic shows weighted average of student's KP masteries
   → Each Topic shows weighted average of student's subtopic masteries
```

---

## Implementation Changes

### 1. Pass Student Mastery Data to Graph Canvas

**File: `src/components/KnowledgeGraphApp.tsx`**

Currently the `useStudentMastery` hook is used inside `MasterySidebar`. We need to lift this state up so it can be passed to `GraphCanvas` for visual display.

Changes:
- Move `useStudentMastery` hook call to `KnowledgeGraphApp`
- Pass the mastery Map to both `GraphCanvas` and `MasterySidebar`
- Add `studentMastery` prop to `GraphCanvas`

---

### 2. Visualize Mastery on Graph Nodes

**File: `src/components/graph/GraphNode.tsx`**

Add visual mastery indicators when in mastery mode:

- **Node fill opacity**: Scale with effective mastery (0% = 30% opacity, 100% = 100% opacity)
- **Border color**: 
  - Green border for mastered skills (80%+ effective mastery)
  - Orange border for aging skills
  - Red dashed border for expired skills
- **Mastery percentage badge**: Small badge below the node name showing percentage

New props:
```typescript
masteryData?: {
  effectiveMastery: number;
  retentionStatus: 'current' | 'aging' | 'expired';
};
showMasteryIndicator?: boolean;
```

---

### 3. Update GraphCanvas to Apply Mastery Visuals

**File: `src/components/graph/GraphCanvas.tsx`**

Changes:
- Accept new prop: `studentMastery: Map<string, KPMastery>`
- Accept new prop: `showMasteryVisuals: boolean` (true when student is selected in mastery mode)
- When rendering each node, look up the student's mastery for that skill ID
- Pass mastery data to `GraphNodeComponent`

---

### 4. Show Student Mastery in Node Detail Panel

**File: `src/components/panels/NodeDetailPanel.tsx`**

When mastery mode is active and a student is selected:
- Add a "Student Mastery" section to the panel
- Display:
  - Student name
  - Effective Mastery percentage with progress bar
  - Raw Mastery (before retention decay)
  - Retention Factor percentage
  - Retention Status badge (Current/Aging/Expired)
  - Last reviewed date
  - Successful retrieval count
  - Stability score

New props:
```typescript
masteryMode?: boolean;
studentMastery?: KPMastery;
studentName?: string;
```

---

### 5. Ensure Hierarchy View Uses Student-Specific Data

**File: `src/components/mastery/HierarchicalMasteryView.tsx`**

The component already receives `skillMastery` as a prop. Verify that:
- When a student is selected, the mastery Map contains only that student's data
- Aggregation functions correctly calculate weighted averages per-student
- Clear indication when showing "Class Average" vs individual student

---

### 6. Update MasterySidebar to Receive External Mastery

**File: `src/components/mastery/MasterySidebar.tsx`**

Changes:
- Accept `studentMastery` as a prop instead of calling `useStudentMastery` internally
- This allows the parent component to share the same mastery data with the graph

---

## Technical Details

### Data Flow Architecture

```text
KnowledgeGraphApp (root)
├── useStudentMastery(graphId, studentId)  ← Hook called here
│   └── Returns: Map<skillId, KPMastery>
│
├── GraphCanvas
│   ├── studentMastery: Map<skillId, KPMastery>  ← Passed down
│   └── GraphNodeComponent
│       └── masteryData: { effectiveMastery, retentionStatus }
│
├── NodeDetailPanel
│   └── studentMastery: KPMastery | undefined  ← For selected node
│
└── MasterySidebar
    └── HierarchicalMasteryView
        └── skillMastery: Map<skillId, KPMastery>  ← Same data
```

### Mastery Calculation Flow

1. **KP Level**: Direct lookup from `student_kp_mastery` table
   - `effectiveMastery = rawMastery * retentionFactor`

2. **Subtopic Level**: Weighted average of child KPs
   - `subtopicMastery = Σ(kp.effectiveMastery × kp.maxPoints) / Σ(kp.maxPoints)`

3. **Topic Level**: Weighted average of child subtopics
   - `topicMastery = Σ(subtopic.totalEarnedPoints) / Σ(subtopic.totalMaxPoints)`

---

## Visual Design

### Node Mastery Indicators (when student selected)

| Mastery Range | Visual Treatment |
|--------------|------------------|
| 90-100% | Green glow ring, full opacity |
| 80-89% | Light green border, full opacity |
| 60-79% | Normal border, 80% opacity |
| 40-59% | Orange border, 60% opacity |
| 0-39% | Red border, 40% opacity |

### Retention Status Overlays

| Status | Visual |
|--------|--------|
| Current | Solid border |
| Aging | Dashed border + clock icon |
| Expired | Dotted red border + warning icon |

---

## Files to Create/Modify

### Modified Files

| File | Changes |
|------|---------|
| `src/components/KnowledgeGraphApp.tsx` | Lift useStudentMastery hook, pass mastery to children |
| `src/components/graph/GraphCanvas.tsx` | Accept studentMastery prop, pass to nodes |
| `src/components/graph/GraphNode.tsx` | Add mastery visualization (opacity, border, badge) |
| `src/components/panels/NodeDetailPanel.tsx` | Add student mastery section |
| `src/components/mastery/MasterySidebar.tsx` | Accept mastery as prop instead of internal hook |

---

## Implementation Order

1. **Lift mastery hook to KnowledgeGraphApp** - Move `useStudentMastery` call up
2. **Update MasterySidebar** - Accept mastery as prop
3. **Add mastery props to GraphCanvas** - Pass mastery data through
4. **Visualize mastery on GraphNode** - Add opacity/border/badge indicators
5. **Update NodeDetailPanel** - Show student mastery section
6. **Test end-to-end** - Verify student selection updates all views

---

## Edge Cases

- **No student selected**: Show class average (existing behavior) or hide mastery indicators on nodes
- **Student with no attempts**: Show 0% mastery, "No data yet" message
- **Skill not practiced by student**: Show "--" or "Not attempted" 
- **Switching students**: Clear and reload mastery data
- **Switching classes**: Clear student selection, reset mastery view

---

## Summary

This implementation ensures that:
1. Each student's mastery is tracked independently per KP
2. Selecting a student updates the entire UI to show their specific data
3. Subtopic and Topic mastery are calculated as weighted averages specific to that student
4. Visual cues on the graph make it easy to identify strong and weak areas
5. The node detail panel provides deep-dive mastery information for the selected student
