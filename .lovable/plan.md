
# Remove Node Badges and Create Full-Screen Node Detail View

## Overview

Two changes requested:
1. Remove the Lv2/Lv3 (target level) badges from graph nodes completely
2. Display node details in a full-screen, scrollable view when clicking a node

---

## Part 1: Remove CME/Target Badge from Nodes

**File**: `src/components/graph/GraphNode.tsx`

Remove the entire badge section (lines 186-204):

```typescript
// DELETE THIS ENTIRE BLOCK:
{/* CME/Target badge (top right) */}
<g transform={`translate(${nodeRadius - 6}, ${-nodeRadius + 6})`}>
  <circle r={10} ... />
  <text ...>{badgeValue}</text>
</g>
```

Also remove the unused variables:
- `isUnmeasured` (line 48)
- `targetLevel` (line 108)
- `badgeValue` (line 109-111)

**Result**: Clean nodes with just colors (root/intermediate/leaf) and names.

---

## Part 2: Full-Screen Scrollable Node Detail Modal

**File**: `src/components/panels/NodeDetailPanel.tsx`

Transform from a side panel to a full-screen modal overlay:

### Current Layout
```text
+-------------------+--------+
|                   | Detail |
|   Graph Canvas    | Panel  |
|                   | (w-80) |
+-------------------+--------+
```

### New Layout
```text
+---------------------------+
|   Graph Canvas (behind)   |
+---------------------------+
|  +---------------------+  |
|  |  FULL SCREEN MODAL  |  |
|  |                     |  |
|  |  (scrollable)       |  |
|  |                     |  |
|  +---------------------+  |
+---------------------------+
```

### Implementation Changes

**Updated Component Structure**:
```tsx
export function NodeDetailPanel({ ... }: NodeDetailPanelProps) {
  return (
    // Fixed overlay covering entire screen
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
      {/* Modal container - max width, full height with scroll */}
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
        
        {/* Sticky header with close button */}
        <div className="sticky top-0 bg-card border-b border-border p-6 rounded-t-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{node.name}</h2>
              {node.description && (
                <p className="text-muted-foreground mt-2">{node.description}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* LE Section */}
          {/* CME Section */}
          {/* Prerequisites Section */}
          {/* Unlocks Section */}
        </div>
        
      </div>
    </div>
  );
}
```

**File**: `src/components/KnowledgeGraphApp.tsx`

Move the NodeDetailPanel outside the flex layout to work as a true overlay:

```tsx
// Change from:
<div className="flex-1 flex overflow-hidden">
  <div className="flex-1 relative">
    <GraphCanvas ... />
  </div>
  {selectedNode && (
    <div className="shrink-0 p-4">
      <NodeDetailPanel ... />
    </div>
  )}
</div>

// To:
<div className="flex-1 flex overflow-hidden">
  <div className="flex-1 relative">
    <GraphCanvas ... />
  </div>
</div>

{/* Full-screen modal overlay */}
{selectedNode && (
  <NodeDetailPanel ... />
)}
```

---

## Part 3: Add Animation for Modal

**File**: `src/index.css`

Add a scale-in animation for the modal:

```css
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}
```

---

## Part 4: Handle Click Outside to Close

**File**: `src/components/panels/NodeDetailPanel.tsx`

Add backdrop click handler to close the modal:

```tsx
<div 
  className="fixed inset-0 z-50 ..."
  onClick={(e) => {
    // Close only if clicking the backdrop, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  }}
>
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/components/graph/GraphNode.tsx` | Remove entire CME/Target badge group and related variables |
| `src/components/panels/NodeDetailPanel.tsx` | Convert to full-screen modal with scrollable content |
| `src/components/KnowledgeGraphApp.tsx` | Move NodeDetailPanel outside flex container for proper overlay |
| `src/index.css` | Add scale-in animation for modal |

---

## Visual Before/After

```text
BEFORE (Side Panel):
+---------------------+--------+
|                     | Detail |
|   Graph with        | Panel  |
|   Lv2/Lv3 badges    | w-80   |
|                     |        |
+---------------------+--------+

AFTER (Full-Screen Modal):
+---------------------------+
|        Graph with         |
|     NO badges (clean)     |
+---------------------------+
       |                   |
       | +---------------+ |
       | |  FULL SCREEN  | |
       | |  Node Details | |
       | |  (scrollable) | |
       | +---------------+ |
       |                   |
+---------------------------+
```

---

## Expected Outcome

- **Cleaner nodes**: No more Lv2/Lv3 badges cluttering the visualization
- **Full node details**: Modal shows all information in a large, readable format
- **Scrollable content**: Long content (many prerequisites/unlocks) scrolls naturally
- **Better UX**: Click outside modal to dismiss, proper focus on details
