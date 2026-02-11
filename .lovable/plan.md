

# Manual Graph Editing + Grouped Views

## Part 1: Manual Node & Edge CRUD

### Add Node
- Add an "Add Skill" button to the header toolbar (visible when a graph is loaded)
- Opens a dialog with fields: Skill ID (snake_case), Name, Tier (dropdown: foundational/core/applied/advanced), Description (optional)
- Inserts into both local graph state and database (`skills` table)
- Auto-triggers level recomputation since new node starts at Level 0

### Remove Node
- Add a "Delete" button in the `NodeDetailPanel` header
- Shows confirmation dialog listing impact: which questions reference this skill, which edges will be removed
- Removes the node from local state, database, and cleans up edges pointing to/from it
- Updates `appearsInQuestions` references

### Add Edge (Prerequisite)
- Two interaction modes:
  1. **From NodeDetailPanel**: "Add Prerequisite" button opens a searchable dropdown of all other nodes; selecting one creates the edge
  2. **From NodeDetailPanel**: "Add Dependent" button (same pattern, reversed direction)
- Validates: no self-loops, no duplicate edges, runs cycle detection before committing
- Persists to `skill_edges` table and updates local state
- Auto-recomputes levels after edge addition

### Remove Edge
- In `NodeDetailPanel`, each prerequisite and dependent gets a small "x" button
- Clicking removes the edge from both local state and database
- Triggers level recomputation

### Files to Create/Modify

| File | Changes |
|------|---------|
| `src/components/panels/AddNodeDialog.tsx` | **New** -- Dialog for adding a skill node |
| `src/components/panels/AddEdgeDialog.tsx` | **New** -- Searchable node picker for adding prerequisites/dependents |
| `src/components/panels/NodeDetailPanel.tsx` | Add delete node button, add/remove prerequisite buttons, add/remove dependent buttons |
| `src/components/KnowledgeGraphApp.tsx` | Add "Add Skill" button to header, wire up add/remove node handlers, add/remove edge handlers |
| `src/hooks/useGraphPersistence.ts` | Add `addNode()`, `removeNode()`, `addEdge()`, `removeEdge()` methods that persist to DB |

---

## Part 2: Grouped Graph Views (Subtopic & Topic)

### View Toggle
- Add a segmented toggle in the header: **Skills** | **Subtopics** | **Topics**
- Default is "Skills" (current view)

### Subtopic View
- Each subtopic becomes a single "super node" on the canvas
- Super node displays: subtopic name, color, count of skills inside, aggregated mastery (if in mastery mode)
- Edges between super nodes are derived: if any skill in subtopic A has a prerequisite in subtopic B, draw an edge A->B
- Ungrouped skills appear as regular individual nodes
- Clicking a super node expands it in a detail panel showing its constituent skills

### Topic View
- Same concept but one level higher: each topic becomes a super node
- Edges derived from inter-topic skill dependencies
- Ungrouped subtopics and skills appear individually
- Clicking a topic super node shows its subtopics

### Layout
- Both grouped views reuse the same `GraphCanvas` layout engine (level-based positioning)
- Levels are recomputed for the grouped nodes based on the derived edges
- Super nodes are rendered larger (radius scales with skill count)

### Files to Create/Modify

| File | Changes |
|------|---------|
| `src/components/graph/GraphCanvas.tsx` | Accept a `viewMode` prop ('skills' / 'subtopics' / 'topics'); when not 'skills', render grouped super nodes with derived edges |
| `src/components/graph/SuperNode.tsx` | **New** -- SVG component for rendering a grouped node (subtopic or topic) |
| `src/components/graph/ViewModeToggle.tsx` | **New** -- Segmented control for switching views |
| `src/components/KnowledgeGraphApp.tsx` | Add view mode state and toggle in header, compute grouped nodes/edges and pass to canvas |
| `src/lib/graph/groupedView.ts` | **New** -- Utility functions to collapse nodes into subtopic/topic super nodes and derive inter-group edges |

---

## Execution Order

1. **Phase 1a**: Add `addNode`, `removeNode`, `addEdge`, `removeEdge` to `useGraphPersistence`
2. **Phase 1b**: Create `AddNodeDialog` and `AddEdgeDialog` components
3. **Phase 1c**: Update `NodeDetailPanel` with delete and edge management buttons
4. **Phase 1d**: Wire everything into `KnowledgeGraphApp` header and handlers
5. **Phase 2a**: Create `groupedView.ts` utility for collapsing nodes
6. **Phase 2b**: Create `SuperNode` and `ViewModeToggle` components
7. **Phase 2c**: Update `GraphCanvas` to support grouped rendering
8. **Phase 2d**: Wire view mode into `KnowledgeGraphApp`

