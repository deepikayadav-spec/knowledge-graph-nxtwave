
# Graph Navigation and Level-Based Display Improvements

## Overview
Transform the current knowledge graph visualization into a Math Academy-style level-based learning map with enhanced navigation, interactivity, and clearer visual hierarchy.

---

## Current State Analysis

### Issues Identified:
1. **No zoom/pan controls** - Large graphs become cramped in fixed 1000x600 viewBox
2. **Level labels missing** - Levels are numbers without context (e.g., "Level 0" instead of "Foundational")
3. **No visual level separation** - Nodes at same level blend together without horizontal bands
4. **Limited interactivity** - No keyboard navigation, no focus-to-node, no minimap
5. **Console warning** - Badge component needs `forwardRef` (line 59 in NodeDetailPanel)
6. **Fixed canvas size** - No responsive scaling for different screen sizes
7. **No level summary** - Users can't see what concepts exist at each level

---

## Proposed Improvements

### 1. Level-Based Visual Layout (Math Academy Style)

Add horizontal level bands with labels on the left side:

```text
+------------------------------------------------------------------+
| Level 0: Foundational                                             |
|   [○]────────[○]────────[○]                                       |
|-------------------------------------------------------------------|
| Level 1: Core Concepts                                            |
|   [○]────[○]────[○]────[○]                                        |
|-------------------------------------------------------------------|
| Level 2: Applications                                             |
|   [○]────────[○]────[○]                                           |
|-------------------------------------------------------------------|
| Level 3: Advanced                                                 |
|   [○]────────[○]                                                  |
+------------------------------------------------------------------+
```

**Implementation:**
- Add level row backgrounds with alternating subtle colors
- Display level labels on the left margin
- Show node count per level
- Increase spacing between levels for clarity

### 2. Zoom and Pan Controls

Add navigation controls for exploring larger graphs:

- **Mouse wheel zoom** - Scroll to zoom in/out centered on cursor
- **Drag to pan** - Click and drag the canvas to move around
- **Zoom controls** - Buttons for zoom in, zoom out, fit-to-view, reset
- **Minimap (optional)** - Small overview showing current viewport position

**Implementation:**
- Track `transform` state: `{ x, y, scale }`
- Apply transform to inner `<g>` element
- Add control buttons in corner overlay
- Implement wheel/drag event handlers

### 3. Enhanced Node Interactivity

Improve how users interact with nodes:

- **Double-click to focus** - Centers and zooms to the clicked node
- **Keyboard navigation** - Arrow keys to move between connected nodes
- **Focus ring** - Visual indicator of currently focused node
- **Connected nodes highlight** - When hovering, highlight all prerequisites and dependents

### 4. Level Summary Sidebar

Add a collapsible sidebar showing level statistics:

| Level | Name | Nodes | Mastered |
|-------|------|-------|----------|
| 0 | Foundational | 3 | 100% |
| 1 | Core Concepts | 4 | 75% |
| 2 | Applications | 5 | 40% |
| 3 | Advanced | 1 | 0% |

Clicking a level row scrolls/zooms to that level in the graph.

### 5. Fix Console Warning

Update Badge component usage in NodeDetailPanel to avoid ref warnings:

```tsx
// Change from passing refs to Badge (which doesn't support them)
// to wrapping in a span or using Badge without ref-requiring patterns
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/graph/GraphCanvas.tsx` | Add zoom/pan state, level bands, transform handling, keyboard navigation |
| `src/components/graph/GraphNode.tsx` | Add focus state, improve hover feedback |
| `src/components/graph/GraphEdge.tsx` | Add connected-nodes highlighting |
| `src/components/graph/LevelBand.tsx` | **New** - Level row background with label |
| `src/components/graph/ZoomControls.tsx` | **New** - Zoom/pan control buttons |
| `src/components/panels/LevelSummary.tsx` | **New** - Sidebar with level statistics |
| `src/components/KnowledgeGraphApp.tsx` | Add level summary sidebar, handle keyboard events |
| `src/types/graph.ts` | Add level name constants |
| `src/index.css` | Add level band styles, zoom control styles |

---

## Technical Details

### Transform State Structure
```typescript
interface Transform {
  x: number;      // Pan offset X
  y: number;      // Pan offset Y
  scale: number;  // Zoom level (0.5 to 3)
}
```

### Zoom/Pan Event Handlers
```typescript
// Mouse wheel zoom
const handleWheel = (e: WheelEvent) => {
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  setTransform(prev => ({
    ...prev,
    scale: Math.min(3, Math.max(0.5, prev.scale * delta))
  }));
};

// Drag to pan
const handleDrag = (e: MouseEvent) => {
  setTransform(prev => ({
    ...prev,
    x: prev.x + e.movementX,
    y: prev.y + e.movementY
  }));
};
```

### Level Band Component
```typescript
interface LevelBandProps {
  level: number;
  levelName: string;
  y: number;
  height: number;
  nodeCount: number;
}
```

### Dynamic ViewBox Calculation
```typescript
// Calculate viewBox based on number of nodes and levels
const calculateViewBox = (nodes: GraphNode[]) => {
  const maxLevel = Math.max(...nodes.map(n => n.level));
  const maxNodesAtLevel = Math.max(
    ...Object.values(levelGroups).map(g => g.length)
  );
  
  const width = Math.max(1000, maxNodesAtLevel * 150 + 200);
  const height = Math.max(600, (maxLevel + 1) * 150 + 100);
  
  return `0 0 ${width} ${height}`;
};
```

---

## Visual Enhancements

### Level Band Colors
- Level 0: `hsl(173 58% 39% / 0.05)` - Teal tint
- Level 1: `hsl(199 89% 48% / 0.05)` - Blue tint
- Level 2: `hsl(221 83% 53% / 0.05)` - Indigo tint
- Level 3+: `hsl(262 83% 58% / 0.05)` - Purple tint

### Zoom Control Styling
- Glass-morphism background matching panel style
- Icons: ZoomIn, ZoomOut, Maximize2 (fit), RotateCcw (reset)
- Position: Bottom-right corner of graph area

---

## Implementation Order

1. Fix Badge forwardRef warning first (quick fix)
2. Add level bands with labels
3. Implement zoom/pan controls
4. Add keyboard navigation
5. Create level summary sidebar
6. Add connected-nodes highlighting on hover
7. Implement double-click to focus

