
# Improve Graph Aesthetics: Color Legend, Badge Clarity, and Edge Decluttering

## Overview

Address three visual issues with the knowledge graph:
1. Make node colors meaningful and discoverable via updated legend
2. Clarify what T2/T3 badges mean (or simplify them)
3. Reduce edge clutter for better readability

---

## Part 1: Update Legend Panel with Color Meaning

**File**: `src/components/panels/LegendPanel.tsx`

Replace the current "Node Levels" section (which shows L0-L4) with "Node Types" that explain the actual color scheme:

```text
CURRENT (confusing):
- Node Levels: L0 Foundational, L1 Basic, L2 Intermediate...
  (but these don't match what's displayed!)

UPDATED (accurate):
- Node Types by Position:
  - Green = Root (Foundational skills, no prerequisites)
  - Purple = Intermediate (has prerequisites AND dependents)
  - Orange = Leaf (Advanced skills, no dependents)
  
- CME Badge (top-right circle):
  - "T1-T4" = Target level (unmeasured skill)
  - "0.1-1.0" = Mastery score (measured skill)
```

---

## Part 2: Simplify or Clarify the CME Badge

**File**: `src/components/graph/GraphNode.tsx`

Two options:

### Option A: Replace "T2" with More Intuitive Text
Instead of cryptic "T2", show something like:
- "L2" with tooltip explaining "Target: Recall (simple)"
- Or a small icon with the level

### Option B: Remove Badge for Unmeasured Nodes
Since all nodes are currently unmeasured (simulated data), the T1-T4 adds visual noise without meaning. Hide until measured.

**Recommended**: Option A - Change "T" prefix to something clearer like just the number with a subtle indicator that it's a target vs measured level.

---

## Part 3: Reduce Edge Clutter (Major Visual Improvement)

**File**: `src/components/graph/GraphEdge.tsx`

### 3.1: Reduce Default Edge Opacity and Width
```typescript
// BEFORE:
const strokeWidth = isHighlighted ? 4 : isHovered ? 3 : 2.5;
const opacity = isHighlighted ? 1 : isHovered ? 0.85 : 0.7;

// AFTER (subtler default edges):
const strokeWidth = isHighlighted ? 3.5 : isHovered ? 2.5 : 1.5;
const opacity = isHighlighted ? 1 : isHovered ? 0.7 : 0.35;
```

### 3.2: Use Consistent Light Color for Default Edges
```typescript
// BEFORE (too dark):
: 'hsl(220, 20%, 35%)';

// AFTER (lighter, less intrusive):
: 'hsl(220, 15%, 70%)';
```

### 3.3: Hide Arrow Heads on Default Edges (Optional)
Arrows add visual weight. Show them only on hover/highlight:
```typescript
// Only render arrow if highlighted or hovered
{(isHighlighted || isHovered) && (
  <polygon ... />
)}
```

### 3.4: Add Edge Hover-to-Reveal Pattern
By default, show edges as very subtle lines. On node hover, emphasize only connected edges:
- Non-connected edges become even more transparent (0.15 opacity)
- Connected edges pop to full visibility

**File**: `src/components/graph/GraphCanvas.tsx`

Pass a "dimmed" state to edges that aren't connected to hovered node:
```typescript
const isEdgeDimmed = hoveredNodeId && 
  edge.from !== hoveredNodeId && 
  edge.to !== hoveredNodeId;
```

---

## Part 4: Better Node Spacing (Optional)

**File**: `src/components/graph/GraphCanvas.tsx`

Increase spacing to reduce visual congestion:
```typescript
// BEFORE:
const LEVEL_HEIGHT = 140;
const NODE_SPACING = 150;

// AFTER (more breathing room):
const LEVEL_HEIGHT = 160;
const NODE_SPACING = 180;
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/components/panels/LegendPanel.tsx` | Update legend to explain node colors (root/intermediate/leaf) and CME badge meaning |
| `src/components/graph/GraphNode.tsx` | Clarify T1-T4 badge display (consider "Lv2" or icon instead of "T2") |
| `src/components/graph/GraphEdge.tsx` | Reduce stroke width (2.5→1.5), lower opacity (0.7→0.35), lighter color, optional arrow hiding |
| `src/components/graph/GraphCanvas.tsx` | Add edge dimming when node is hovered, increase spacing |

---

## Visual Before/After

```text
BEFORE:
┌─────────────────────────────────────────┐
│  Thick dark edges everywhere (2.5px)    │
│  70% opacity = visually heavy           │
│  All arrows visible = cluttered         │
│  Unclear T2/T3 badges                   │
└─────────────────────────────────────────┘

AFTER:
┌─────────────────────────────────────────┐
│  Subtle light edges (1.5px, 35% opacity)│
│  Edges pop only on hover                │
│  Arrows only when highlighted           │
│  Clear "Level 2" indicators             │
│  Legend explains all colors             │
└─────────────────────────────────────────┘
```

---

## Expected Outcome

- **Cleaner visualization**: Edges fade into background until needed
- **Discoverable meaning**: Legend explains what colors and badges mean
- **Better focus**: Hovering a node highlights only its connections
- **Reduced cognitive load**: Less visual noise on first view
