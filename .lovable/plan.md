
# Fix Graph Dragging, Landing Page Questions, and Question Path Visibility

## Overview
Address three user-reported issues: enable proper graph dragging, add a quick question input option on the landing page, and fix the dropdown that hides questions beyond the visible area.

---

## Issue 1: Graph Dragging Not Working Properly

### Problem
The graph can only be panned when clicking directly on the SVG background element. Clicking on level bands or other areas doesn't initiate dragging because of this condition in `handleMouseDown`:
```typescript
if (e.button === 0 && (e.target as SVGElement).tagName === 'svg') {
```

### Solution
Allow dragging from anywhere on the canvas (including level bands) by checking if the click is NOT on a node. This involves:

1. Modify `handleMouseDown` to allow dragging from any element except nodes
2. Use a data attribute on nodes to identify them as non-draggable targets
3. Update cursor handling for better UX

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/graph/GraphCanvas.tsx` | Update `handleMouseDown` logic to allow dragging from level bands |
| `src/components/graph/GraphNode.tsx` | Add `data-draggable="false"` to prevent drag initiation on nodes |

---

## Issue 2: Add Questions Directly on Landing Page

### Problem
Users must click "New Graph" button to open a modal to input questions. There's no direct input option visible on the landing page.

### Solution
Add a collapsible "Quick Add" section in the main area when no graph is displayed, or add a persistent input bar in the toolbar.

**Chosen approach**: Add a compact inline question input in the toolbar that expands when focused, providing a quicker path to generating graphs without opening the full modal.

### New Components
| Component | Purpose |
|-----------|---------|
| `QuickQuestionInput.tsx` | Compact inline input for adding questions directly from toolbar |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/KnowledgeGraphApp.tsx` | Add QuickQuestionInput to toolbar |
| `src/components/panels/QuickQuestionInput.tsx` | **New** - Inline input with course name + questions |

### UI Design
```text
+------------------------------------------------------------------+
| Toolbar                                                          |
| [Course Selector] [Question Path] | Enter questions here... [Go] |
+------------------------------------------------------------------+
```

When focused, the input expands to show a multi-line textarea for entering multiple questions.

---

## Issue 3: Question Path Dropdown Only Shows ~3 Questions

### Problem
The `DropdownMenuContent` in `QuestionPathSelector.tsx` has fixed width (`w-80`) but no height constraints. When there are many questions (e.g., 12), the dropdown extends beyond the viewport and gets cut off, making only ~3 questions visible.

### Solution
Add:
1. `max-height` with `overflow-y: auto` for scrollable content
2. Proper background color to ensure dropdown isn't transparent
3. Higher z-index to prevent layering issues

### File to Modify
| File | Changes |
|------|---------|
| `src/components/panels/QuestionPathSelector.tsx` | Add `max-h-[300px]` and `overflow-y-auto` to DropdownMenuContent |

### Code Change
```tsx
<DropdownMenuContent 
  align="start" 
  className="w-80 max-h-[300px] overflow-y-auto bg-popover"
>
```

---

## Technical Implementation Details

### 1. Graph Dragging Fix

```typescript
// GraphCanvas.tsx - Update handleMouseDown
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  // Allow dragging from any element except nodes
  const target = e.target as SVGElement;
  const isNode = target.closest('[data-node-id]');
  
  if (e.button === 0 && !isNode) {
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }
}, [transform]);

// GraphNode.tsx - Add data attribute
<g 
  data-node-id={node.id}
  // ... existing props
>
```

### 2. Quick Question Input Component

```typescript
interface QuickQuestionInputProps {
  onGenerate: (courseName: string, questions: string[]) => void;
  isLoading: boolean;
}

// Compact input that expands on focus
// Collapsed: [Course: ______] [Questions: _______] [Generate]
// Expanded: Shows textarea for multiple questions
```

### 3. Question Path Dropdown Scroll

Add scroll behavior and ensure solid background:
```tsx
<DropdownMenuContent 
  align="start" 
  className="w-80 max-h-[300px] overflow-y-auto bg-popover border border-border shadow-lg"
>
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/graph/GraphCanvas.tsx` | Modify | Fix drag detection to work on level bands |
| `src/components/graph/GraphNode.tsx` | Modify | Add data attribute for drag exclusion |
| `src/components/panels/QuestionPathSelector.tsx` | Modify | Add max-height and scroll to dropdown |
| `src/components/panels/QuickQuestionInput.tsx` | Create | New inline input component for toolbar |
| `src/components/KnowledgeGraphApp.tsx` | Modify | Add QuickQuestionInput to toolbar |

---

## Implementation Order

1. Fix Question Path dropdown visibility (quick fix)
2. Fix graph dragging behavior
3. Add Quick Question Input to landing page
