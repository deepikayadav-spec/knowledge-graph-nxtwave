
# Prerequisite-Based Level Layout (Math Academy Style)

## Overview
Transform the graph to compute levels dynamically from prerequisite relationships, with foundational nodes at the bottom and advanced nodes at the top - exactly like Math Academy.

---

## Current vs Desired

| Aspect | Current | Desired |
|--------|---------|---------|
| Level source | `node.level` property from data | Computed from prerequisite edges |
| Level 0 | Whatever data says | Root nodes (no prerequisites) |
| Higher levels | Whatever data says | `1 + max(level of prerequisites)` |
| Direction | Arbitrary | Bottom = simple, Top = advanced |
| Node colors | Based on data level | Based on graph position (Root/Intermediate/Leaf) |
| Node size | Fixed | Proportional to Learning Effort (LE) |

---

## Visual Layout

```text
+------------------------------------------------------------------+
|                           TOP (Advanced)                          |
|      [Leaf]    [Leaf]    [Leaf]         <- Orange nodes          |
|         \        |        /                                       |
|          \       |       /                                        |
|    [Intermediate]  [Intermediate]       <- Purple nodes          |
|           \          /                                            |
|            \        /                                             |
|         [Root]  [Root]  [Root]          <- Green nodes           |
|                         BOTTOM (Foundational)                     |
+------------------------------------------------------------------+
```

Arrows point UPWARD from prerequisites to dependents.

---

## Changes Required

### 1. Compute Levels from Prerequisites (GraphCanvas.tsx)

Add a function to calculate levels based on graph topology:

```typescript
const computedLevels = useMemo(() => {
  const inDegree: Record<string, Set<string>> = {};
  
  // Find prerequisites for each node
  edges.forEach(edge => {
    if (!inDegree[edge.to]) inDegree[edge.to] = new Set();
    inDegree[edge.to].add(edge.from);
  });
  
  const levels: Record<string, number> = {};
  
  // Level = 0 for nodes with no prerequisites
  // Level = 1 + max(level of all prerequisites)
  const getLevel = (nodeId: string, visited: Set<string>): number => {
    if (levels[nodeId] !== undefined) return levels[nodeId];
    if (visited.has(nodeId)) return 0; // Cycle detection
    
    visited.add(nodeId);
    const prereqs = inDegree[nodeId];
    if (!prereqs || prereqs.size === 0) {
      levels[nodeId] = 0;
    } else {
      const maxPrereqLevel = Math.max(
        ...Array.from(prereqs).map(p => getLevel(p, visited))
      );
      levels[nodeId] = maxPrereqLevel + 1;
    }
    return levels[nodeId];
  };
  
  nodes.forEach(node => getLevel(node.id, new Set()));
  return levels;
}, [nodes, edges]);
```

### 2. Update Node Grouping to Use Computed Levels

Change from using `node.level` to `computedLevels[node.id]`:

```typescript
const levelGroups = useMemo(() => {
  const groups: Record<number, GraphNode[]> = {};
  nodes.forEach((node) => {
    const level = computedLevels[node.id] ?? 0;
    if (!groups[level]) groups[level] = [];
    groups[level].push(node);
  });
  return groups;
}, [nodes, computedLevels]);
```

### 3. Update Node Colors Based on Graph Position (GraphNode.tsx)

Change coloring to be based on node type (Root/Intermediate/Leaf):

```typescript
type NodeType = 'root' | 'intermediate' | 'leaf';

const nodeTypeColors = {
  root: 'hsl(152, 69%, 41%)',        // Green - Foundational
  intermediate: 'hsl(262, 83%, 58%)', // Purple - Middle
  leaf: 'hsl(35, 92%, 53%)',          // Orange - Advanced
};
```

Pass node type as a prop based on:
- **Root**: No prerequisites (nothing points to it)
- **Leaf**: No dependents (nothing depends on it)
- **Intermediate**: Has both

### 4. Scale Node Size by Learning Effort (LE)

Make node radius proportional to `finalLE`:

```typescript
const baseRadius = 20;
const maxRadius = 45;
const leMin = 10;
const leMax = 80;

const nodeRadius = baseRadius + 
  ((node.le.finalLE - leMin) / (leMax - leMin)) * (maxRadius - baseRadius);
```

### 5. Update Level Labels (LevelBand.tsx)

Change level names to reflect prerequisite depth:

```typescript
const COMPUTED_LEVEL_LABELS = [
  'Foundational',
  'Building Blocks', 
  'Core Skills',
  'Applied Skills',
  'Advanced',
  'Expert',
];
```

### 6. Display CME Value on Nodes

Add a small badge showing CME value (like the 0.5, 0.8 in your reference):

```typescript
// CME badge near node
<text fontSize={9} fill="hsl(199, 89%, 48%)">
  {(node.cme.highestConceptLevel / 7).toFixed(1)}
</text>
```

### 7. Update Edge Direction Display

Ensure edges visually flow from bottom (prerequisites) to top (dependents).

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/graph/GraphCanvas.tsx` | Compute levels from edges, update level grouping |
| `src/components/graph/GraphNode.tsx` | Add node type prop (root/intermediate/leaf), scale size by LE, add CME badge |
| `src/components/graph/LevelBand.tsx` | Update labels for computed levels |
| `src/components/panels/LevelSummary.tsx` | Use computed levels, update labels |
| `src/types/graph.ts` | Add computed level labels constant |

---

## Technical Details

### Level Computation Algorithm

1. Build prerequisite map from edges
2. For each node, recursively find max level of prerequisites
3. Node level = 1 + max(prerequisite levels), or 0 if no prerequisites
4. Group nodes by computed level for positioning

### Node Type Determination

```typescript
const getNodeType = (nodeId: string): NodeType => {
  const hasPrerequisites = edges.some(e => e.to === nodeId);
  const hasDependents = edges.some(e => e.from === nodeId);
  
  if (!hasPrerequisites) return 'root';
  if (!hasDependents) return 'leaf';
  return 'intermediate';
};
```

### Node Size Scaling

```typescript
// Normalize LE to radius
const getNodeRadius = (le: number) => {
  const normalized = Math.max(0, Math.min(1, (le - 10) / 70));
  return 20 + normalized * 25; // 20px to 45px
};
```
