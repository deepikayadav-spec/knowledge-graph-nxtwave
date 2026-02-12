

# Super Node Click Detail Panel and Text Visibility Fix

## Problem 1: Clicking subtopic/topic nodes does nothing

When a super node (subtopic or topic) is clicked, `handleNodeClick` sets `selectedNodeId` to its ID (e.g., `subtopic_xxx`). But `selectedNode` is derived by searching `graph.globalNodes` (line 312-314), which only contains skill nodes -- so it never finds a match, and `NodeDetailPanel` never opens.

## Problem 2: Text on super nodes is truncated

The `SuperNode.tsx` component truncates names to 18 characters (line 54) and uses a tiny dynamic font size (line 52: `Math.max(9, 11 - Math.floor(node.name.length / 8))`). This makes long subtopic/topic names unreadable.

---

## Solution

### 1. New `SuperNodeDetailPanel` component

Create a new panel that opens when a super node is clicked, showing:
- The subtopic/topic name and color badge
- Type indicator (Subtopic or Topic)
- Count of knowledge points inside
- A scrollable list of all contained KPs (with name and skill ID)
- Click on any KP in the list to navigate to its full `NodeDetailPanel`

### 2. Wire up super node click in `KnowledgeGraphApp.tsx`

- Add a `selectedSuperNodeId` state
- When a node is clicked, check if it's a super node (using `groupedData.isSuperNode`). If yes, set `selectedSuperNodeId`; if no, set `selectedNodeId` as before
- Render `SuperNodeDetailPanel` when `selectedSuperNodeId` is set
- Resolve the super node data from `groupedData.nodes`

### 3. Fix text visibility in `SuperNode.tsx`

- Use `foreignObject` instead of `<text>` for the name label (same approach as `GraphNode.tsx`) -- this enables proper word wrapping
- Increase the label area so full names are visible
- Remove the 18-character truncation
- Use a readable font size (11-12px) with proper text wrapping
- Position the label below the circle (like skill nodes do) for more space

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `src/components/panels/SuperNodeDetailPanel.tsx` | **New** -- Modal panel showing super node name, type, skill count, and a clickable list of contained KPs |
| `src/components/KnowledgeGraphApp.tsx` | Add `selectedSuperNodeId` state; route super node clicks to new panel; pass `groupedData` info to resolve super node; render `SuperNodeDetailPanel` |
| `src/components/graph/SuperNode.tsx` | Replace `<text>` with `foreignObject` for the name label; remove truncation; use proper word-wrap styling; increase label area |

## Technical Details

### SuperNodeDetailPanel props
```
- superNode: SuperNode (from groupedView.ts)
- skills: GraphNode[] (the contained KPs, filtered from graph.globalNodes)
- onClose: () => void
- onSkillSelect: (skillId: string) => void (navigates to that skill's NodeDetailPanel)
```

### Click routing logic in KnowledgeGraphApp
```
When onNodeSelect is called with an ID:
  1. Check if groupedData?.isSuperNode(id) is true
  2. If yes: set selectedSuperNodeId = id, clear selectedNodeId
  3. If no: set selectedNodeId = id, clear selectedSuperNodeId
```

### SuperNode text fix
- Replace the `<text>` element with a `foreignObject` positioned below the circle
- Width: 140px (wider than the node)
- Use CSS `word-break: break-word`, `text-align: center`, `font-size: 11px`
- Remove the `node.name.length > 18` truncation
- Keep the skill count badge as a separate element below the name

