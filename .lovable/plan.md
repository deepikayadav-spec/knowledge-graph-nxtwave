
# Hide Learning Metrics in Normal Mode

## Overview

Modify the NodeDetailPanel to only display Learning Effort (LE) and Concept Mastery Evidence (CME) sections when in Mastery Mode with a student selected. In normal mode (non-mastery), only show basic node details: name, description, prerequisites, and unlocks.

## Current Behavior

| Section | Currently Visible | Normal Mode | Mastery Mode (No Student) | Mastery Mode (Student Selected) |
|---------|------------------|-------------|---------------------------|--------------------------------|
| Node Name/Description | Always | Yes | Yes | Yes |
| Student Mastery | When student selected | No | No | Yes |
| Learning Effort (LE) | Always | **Yes** | **Yes** | Yes |
| Concept Mastery Evidence (CME) | Always | **Yes** | **Yes** | Yes |
| Prerequisites | Always | Yes | Yes | Yes |
| Unlocks | Always | Yes | Yes | Yes |

## Proposed Behavior

| Section | Normal Mode | Mastery Mode (No Student) | Mastery Mode (Student Selected) |
|---------|-------------|---------------------------|--------------------------------|
| Node Name/Description | Yes | Yes | Yes |
| Student Mastery | No | No | Yes |
| Learning Effort (LE) | **No** | **No** | Yes |
| Concept Mastery Evidence (CME) | **No** | **No** | Yes |
| Prerequisites | Yes | Yes | Yes |
| Unlocks | Yes | Yes | Yes |

## File Changes

### NodeDetailPanel.tsx

Wrap the LE and CME sections with a conditional that checks for both mastery mode AND student selection:

**Current code (lines 270-384):**
```tsx
{/* Learning Effort (LE) Section */}
<section className="space-y-3">
  <div className="flex items-center gap-2 text-base font-semibold text-foreground">
    <Timer className="h-5 w-5 text-accent" />
    Learning Effort (LE)
  </div>
  {/* ... LE content ... */}
</section>

<Separator />

{/* Concept Mastery Evidence (CME) Section */}
<section className="space-y-3">
  <div className="flex items-center gap-2 text-base font-semibold text-foreground">
    <Brain className="h-5 w-5 text-accent" />
    Concept Mastery Evidence (CME)
  </div>
  {/* ... CME content ... */}
</section>

<Separator />
```

**Updated code:**
```tsx
{/* Learning Effort & CME Sections - Only in mastery mode with student selected */}
{masteryMode && studentName && (
  <>
    {/* Learning Effort (LE) Section */}
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Timer className="h-5 w-5 text-accent" />
        Learning Effort (LE)
      </div>
      {/* ... LE content ... */}
    </section>

    <Separator />

    {/* Concept Mastery Evidence (CME) Section */}
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Brain className="h-5 w-5 text-accent" />
        Concept Mastery Evidence (CME)
      </div>
      {/* ... CME content ... */}
    </section>

    <Separator />
  </>
)}
```

## Visual Summary

**Normal Mode (clicking any node):**
```
+----------------------------------+
| Node Name                    [X] |
| Description text                 |
+----------------------------------+
| Prerequisites (3)                |
|   • Prereq 1                     |
|   • Prereq 2                     |
|   • Prereq 3                     |
+----------------------------------+
| Unlocks (2)                      |
|   • Unlock 1                     |
|   • Unlock 2                     |
+----------------------------------+
```

**Mastery Mode with Student Selected:**
```
+----------------------------------+
| Node Name                    [X] |
| Description text                 |
+----------------------------------+
| Student Mastery    [Jane Doe]    |
|   Effective Mastery: 78%         |
|   Raw Mastery: 85%               |
|   Retention: Current             |
|   ...                            |
+----------------------------------+
| Learning Effort (LE)             |
|   Passive Time: 12 min           |
|   Active Time: 8 min             |
|   Final LE: 15.6 min             |
+----------------------------------+
| Concept Mastery Evidence (CME)   |
|   Highest Level: L3              |
|   Independence: Lightly Scaff... |
|   Retention: Current             |
|   Level Breakdown: ...           |
+----------------------------------+
| Prerequisites (3)                |
|   ...                            |
+----------------------------------+
| Unlocks (2)                      |
|   ...                            |
+----------------------------------+
```

## Technical Notes

- The condition `masteryMode && studentName` ensures both conditions are met
- This aligns with the existing Student Mastery section's visibility logic
- The dummy data generation functions (generateDummyCME, generateDummyLE) will still be called but their output won't be rendered - this is fine for now, but could be optimized later to only generate when needed
- Prerequisites and Unlocks sections remain visible in all modes as they are structural graph information

## Summary

| Change | File | Lines Affected |
|--------|------|----------------|
| Wrap LE section in conditional | NodeDetailPanel.tsx | ~270-310 |
| Wrap CME section in conditional | NodeDetailPanel.tsx | ~312-384 |
| Update separator logic | NodeDetailPanel.tsx | ~310, ~384 |
