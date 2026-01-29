

# UI Cleanup and Metrics Update Plan

## Overview
This plan addresses 4 changes:
1. Remove the Quick Add Question button from the graph view header
2. Make edges more visible with dark colors and thicker lines
3. Improve node name visibility
4. Update the learning metrics panel to use actual terminology from the Pod Metrics document

---

## Change 1: Remove Quick Add Question Button

**File:** `src/components/KnowledgeGraphApp.tsx`

Remove the `QuickQuestionInput` component from the header section (lines 148-151) in the graph view. The import can stay since it's still used for the landing page.

**What to remove:**
```tsx
<QuickQuestionInput
  onGenerate={handleGenerate}
  isLoading={isGenerating}
/>
```

---

## Change 2: Make Edges More Visible

**File:** `src/components/graph/GraphEdge.tsx`

Update the edge styling:
- Use dark colors instead of light pastels
- Increase stroke width significantly
- Increase opacity for better visibility
- Make arrows larger

**Current values:**
- Default color: `hsl(215, 25%, 75%)` (light gray)
- Default stroke width: `1.5`
- Default opacity: `0.5`

**New values:**
- Default color: `hsl(220, 20%, 35%)` (dark slate gray)
- Default stroke width: `2.5`
- Default opacity: `0.7`
- Highlighted: stroke width `4`, opacity `1`
- Hovered: stroke width `3`, opacity `0.85`
- Arrow size: `8` (from `6`)

---

## Change 3: Improve Node Name Visibility

**File:** `src/components/graph/GraphNode.tsx`

Update the foreignObject node label (lines 206-223):
- Increase font size from `10px` to `11px`
- Add a subtle text shadow for contrast against the canvas
- Use darker text color for better readability
- Increase the foreignObject dimensions for longer names

---

## Change 4: Update Learning Metrics Terminology

**File:** `src/components/panels/NodeDetailPanel.tsx`

Replace the current simple metrics display with the actual framework from the Pod Metrics document:

**Learning Effort (LE) section will show:**
- Passive Learning Time (dummy: 5-20 min)
- Active Learning Time (dummy: 5-15 min)  
- Persistence Factor (dummy: 0.25 or 0.5)
- Final LE calculation display

**Learning Value section (CME) will show:**
- Highest Concept Level (dummy: Level 1-7 with descriptions)
- Independence Status (dummy: one of Independent / Lightly Scaffolded / Heavily Assisted)
- Knowledge Retention (dummy: one of Current / Aging / Expired)
- Per-level percentage breakdown (dummy percentages for levels 1-4)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/KnowledgeGraphApp.tsx` | Remove QuickQuestionInput from header (lines 148-151) |
| `src/components/graph/GraphEdge.tsx` | Dark colors, thick strokes, higher opacity (lines 38-45) |
| `src/components/graph/GraphNode.tsx` | Larger font, text shadow for labels (lines 206-223) |
| `src/components/panels/NodeDetailPanel.tsx` | Complete rewrite of metrics section with CME + LE framework |

---

## Visual Preview

**Edge Changes:**
```
Before: Light gray, thin (1.5px), 50% opacity
After:  Dark slate, thick (2.5px), 70% opacity
```

**Node Label Changes:**
```
Before: 10px font, no shadow
After:  11px font, subtle shadow for contrast
```

**Metrics Panel:**
```
Before:
  Learning Value: 75 points
  Learning Effort: 25 minutes

After:
  LEARNING EFFORT (LE)
  ├── Passive Time: 12 min
  ├── Active Time: 8 min  
  ├── WET: 14 min
  ├── Persistence: +0.25
  └── Final LE: 17.5 min

  CONCEPT MASTERY EVIDENCE (CME)
  ├── Highest Level: Level 4 (Direct Application)
  ├── Independence: Lightly Scaffolded
  ├── Retention: Current
  └── Level Breakdown:
      L1: 100% | L2: 85% | L3: 70% | L4: 45%
```

