

# Terminology Pivot: "Skills" to "Knowledge Points" (User-Facing)

## Overview

Replace all **user-facing** instances of "skill/skills" with "knowledge point/knowledge points" (or "KP/KPs" where space is tight). Internal variable names, database columns, and code identifiers remain unchanged for stability.

## Changes by File

### 1. `src/components/graph/ViewModeToggle.tsx`
- Line 12: `'Skills'` label becomes `'Knowledge Points'`

### 2. `src/components/graph/SuperNode.tsx`
- Line 75: `{node.skillCount} skill{...}` becomes `{node.skillCount} KP{...}`

### 3. `src/components/graph/GroupingToolbar.tsx`
- Line 48: `{selectedCount} skill{...} selected` becomes `{selectedCount} KP{...} selected`
- Line 80: `Group {selectedCount} selected skill{...}` becomes `Group {selectedCount} selected knowledge point{...}`

### 4. `src/components/graph/GraphNode.tsx`
- Line 382 (comment only): `Mastered skill glow` -- comment update, cosmetic

### 5. `src/components/panels/AddNodeDialog.tsx`
- Line 53: Dialog title `"Add Skill"` becomes `"Add Knowledge Point"`
- Line 64: Label `"Skill ID"` becomes `"KP ID"`
- Line 84: Label placeholder `"What does this skill represent?"` becomes `"What does this knowledge point represent?"`
- Line 91: Button `"Add Skill"` becomes `"Add Knowledge Point"`

### 6. `src/components/panels/AddEdgeDialog.tsx`
- Line 53: `Select a skill that...` becomes `Select a knowledge point that...`
- Line 54: Same change
- Line 60: Label `"Search skills"` becomes `"Search knowledge points"`
- Line 67: `"No matching skills"` becomes `"No matching knowledge points"`

### 7. `src/components/panels/NodeDetailPanel.tsx`
- Line 181: `"remove the skill"` becomes `"remove the knowledge point"`
- Line 184: `"The skill will be removed"` becomes `"The knowledge point will be removed"`
- Line 478: `"Level 0 skill"` becomes `"Level 0 knowledge point"`
- Line 515: `"leaf skill"` becomes `"leaf knowledge point"`

### 8. `src/components/panels/QuestionPathSelector.tsx`
- Line 145: `"Skills that are only used..."` becomes `"Knowledge points that are only used..."`

### 9. `src/components/panels/GenerationProgress.tsx`
- Line 73: `"skills discovered"` becomes `"knowledge points discovered"`

### 10. `src/components/mastery/AttemptLoggerPanel.tsx`
- Line 161: `"Skills: "` label becomes `"KPs: "`

### 11. `src/components/mastery/MasterySidebar.tsx`
- Line 162: `"Select skills on the graph..."` becomes `"Select knowledge points on the graph..."`
- Line 162: `"Organize skills into..."` becomes `"Organize knowledge points into..."`

### 12. `src/components/mastery/HierarchicalMasteryView.tsx`
- Line 177: `"No skills in this subtopic"` becomes `"No knowledge points in this subtopic"`
- Line 237: `"select skills and create subtopics"` becomes `"select knowledge points and create subtopics"`
- Line 273: `"Ungrouped Skills"` becomes `"Ungrouped Knowledge Points"`

## What Stays Unchanged

- All variable/prop names (e.g., `skillId`, `skills`, `skillNames`, `skillCount`)
- Database column names (`skills`, `skill_weights`, `primary_skills`)
- Type names (`SkillTier`, `SkillTopic`, `SkillSubtopic`)
- Hook names (`useSkillGrouping`)
- File names
- Code comments (except the one in GraphNode.tsx for consistency)

This is purely a UI string change -- no logic or data flow is affected.

