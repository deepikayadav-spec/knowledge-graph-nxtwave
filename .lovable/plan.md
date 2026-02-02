

# Student Mastery Tracking System - Implementation Plan

## Overview

Build a mastery tracking system that calculates Knowledge Point (KP) mastery based on weighted question performance, scaffolding independence, and memory retention decay.

---

## Architecture

The knowledge graph structure remains **shared** across all students. Each student's **mastery data** is stored separately and overlaid on the shared graph.

```text
┌─────────────────────────────────────────────────────────────┐
│                    SHARED (One per Graph)                   │
├─────────────────────────────────────────────────────────────┤
│  Knowledge Graph    │  Questions          │  KP Weights     │
│  - Nodes (skills)   │  - Question text    │  - AI-generated │
│  - Edges (prereqs)  │  - Mapped skills    │  - Per question │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  PER-STUDENT (Mastery Layer)                │
├─────────────────────────────────────────────────────────────┤
│  Student Attempts   │  KP Mastery         │  Retention      │
│  - Correct/wrong    │  - Earned points    │  - Decay factor │
│  - Independence     │  - Max points       │  - Stability    │
│  - Timestamp        │  - Raw mastery %    │  - Last review  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    COHORT (Aggregate View)                  │
├─────────────────────────────────────────────────────────────┤
│  Classes            │  Class Analytics                      │
│  - Student list     │  - Average mastery per KP             │
│  - Graph reference  │  - At-risk student detection          │
│  - Teacher owner    │  - Common weak spots                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### Table: `classes`
Groups students into cohorts for aggregate tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| graph_id | uuid | FK to knowledge_graphs |
| name | text | Class name (e.g., "Physics 101 - Fall 2026") |
| teacher_id | text | Owner/teacher identifier |
| created_at | timestamptz | Creation timestamp |

### Table: `class_students`
Many-to-many relationship between classes and students.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| class_id | uuid | FK to classes |
| student_id | text | Student identifier |
| student_name | text | Display name |
| enrolled_at | timestamptz | When student was added |

### Table: `student_attempts`
Records each student's attempt at a question.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| graph_id | uuid | FK to knowledge_graphs |
| class_id | uuid | FK to classes (optional) |
| student_id | text | Student identifier |
| question_id | uuid | FK to questions |
| is_correct | boolean | Did they answer correctly? |
| independence_level | text | 'independent', 'lightly_scaffolded', 'heavily_assisted' |
| attempted_at | timestamptz | When the attempt occurred |

### Table: `student_kp_mastery`
Stores calculated mastery per student per KP.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| graph_id | uuid | FK to knowledge_graphs |
| student_id | text | Student identifier |
| skill_id | text | The KP identifier |
| earned_points | numeric | Sum of weighted correct answers minus penalties |
| max_points | numeric | Sum of all possible points |
| raw_mastery | numeric | earned/max (0-1, clamped at 0) |
| last_reviewed_at | timestamptz | Last successful attempt |
| stability | numeric | Memory strength (starts at 1.0) |
| retrieval_count | integer | Successful recall count |

### Modify Table: `questions`
Add AI-generated weight distribution.

| New Column | Type | Description |
|------------|------|-------------|
| skill_weights | jsonb | Map of skill_id to weight, e.g., `{"kp1": 0.6, "kp2": 0.2, "kp3": 0.2}` |

---

## Core Mastery Formulas

### Weight Distribution (AI-Generated)
- **Primary skill**: 60% of cognitive load
- **Secondary skills**: Remaining 40% split equally

Example for a question testing 3 KPs:
```text
Q1 tests: [KP1 (primary), KP2, KP3]
Weights: { KP1: 0.6, KP2: 0.2, KP3: 0.2 }
```

### Independence Multipliers
| Level | Multiplier | Description |
|-------|------------|-------------|
| Independent | 1.0 | No hints or scaffolding used |
| Lightly Scaffolded | 0.7 | 1-2 hints, minor guidance |
| Heavily Assisted | 0.4 | Step-by-step guidance provided |

### Scoring Logic

**Correct Answer:**
```text
earnedPoints += weight × independenceMultiplier
maxPoints += weight
```

**Wrong Answer:**
```text
earnedPoints -= weight × 0.2  (penalty factor)
earnedPoints = max(0, earnedPoints)  # Never negative
maxPoints += weight
```

**Raw Mastery:**
```text
rawMastery = earnedPoints / maxPoints  (0-1 scale)
```

### Retention Decay (Ebbinghaus Curve)
```text
retention = e^(-daysSince / stability)

Where:
- daysSince = days since last successful attempt
- stability = memory strength (grows with successful recalls)
- retention = 0 to 1 (current memory strength)
```

**Stability Growth:**
```text
newStability = stability × (1 + 0.1 × ln(retrievalCount + 1))
```

**Effective Mastery:**
```text
effectiveMastery = rawMastery × retention
```

**Retention Thresholds:**
| Status | Retention Range |
|--------|-----------------|
| Current | >= 80% |
| Aging | 50-79% |
| Expired | < 50% |

---

## File Structure

### New Files

```text
src/
├── lib/
│   └── mastery/
│       ├── constants.ts          # Multipliers, thresholds
│       ├── calculateWeights.ts   # Weight distribution logic
│       ├── calculateMastery.ts   # Core scoring functions
│       └── retentionDecay.ts     # Ebbinghaus curve logic
├── hooks/
│   ├── useStudentMastery.ts      # Individual mastery state
│   └── useClassAnalytics.ts      # Cohort-level analytics
├── components/
│   └── mastery/
│       ├── AttemptLoggerPanel.tsx      # Manual entry form
│       ├── BulkUploadPanel.tsx         # CSV upload interface
│       ├── StudentSelector.tsx         # Student dropdown
│       ├── ClassManagerPanel.tsx       # Create/manage classes
│       ├── MasteryOverview.tsx         # Per-student dashboard
│       └── ClassAnalyticsPanel.tsx     # Cohort analytics view
└── types/
    └── mastery.ts                # TypeScript interfaces
```

### Modified Files

| File | Changes |
|------|---------|
| `src/types/graph.ts` | Add mastery-related interfaces |
| `supabase/functions/generate-graph/index.ts` | Add skill weight estimation to AI prompt |
| `src/components/panels/NodeDetailPanel.tsx` | Display real mastery data with retention |
| `src/components/graph/GraphNode.tsx` | Visual mastery indicators (color, glow, border) |
| `src/components/KnowledgeGraphApp.tsx` | Add mastery mode toggle and student selector |

---

## UI Components

### 1. Class Manager Panel
- Create new classes (cohorts)
- Add/remove students to classes
- View class roster

### 2. Student Selector
- Dropdown to select active student
- Option to view class aggregate

### 3. Attempt Logger (Manual Entry)
- Select question from dropdown
- Mark correct/incorrect
- Select independence level (radio buttons)
- Optional: add notes

### 4. Bulk Upload Panel
- Drag-and-drop CSV file
- Expected columns: `student_id`, `question_text`, `is_correct`, `independence_level`, `attempted_at`
- Preview parsed data before import
- Validation errors shown inline

### 5. Mastery Overview
- Per-student view of all KP mastery levels
- Sort by effective mastery, retention status
- Filter by "Aging" or "Expired" KPs

### 6. Class Analytics Panel
- Average mastery per KP across cohort
- Identify at-risk students (below threshold)
- Highlight common weak spots (low-mastery KPs)

---

## Visual Mastery Indicators on Graph

Nodes will visually reflect mastery through:

| Visual Property | Meaning |
|-----------------|---------|
| **Fill opacity** | Higher mastery = more solid color |
| **Green glow** | 90%+ effective mastery |
| **Dashed border** | "Aging" retention (50-80%) |
| **Dotted border** | "Expired" retention (< 50%) |
| **Warning badge** | KP needs review soon |

---

## AI Prompt Update for Weight Generation

The `generate-graph` edge function prompt will be updated to include:

```text
For each question, estimate the cognitive load distribution across skills:
1. Identify the PRIMARY skill - the main differentiator that requires the most effort
2. Identify SECONDARY skills - prerequisite knowledge applied passively
3. Assign weights that sum to 1.0:
   - Primary skill: 0.5-0.7 depending on dominance
   - Secondary skills: split the remainder equally

Output questionPaths with skillWeights:
{
  "Question text": {
    "requiredNodes": ["skill1", "skill2", "skill3"],
    "skillWeights": {"skill1": 0.6, "skill2": 0.2, "skill3": 0.2},
    "executionOrder": ["skill1", "skill2", "skill3"],
    "validationStatus": "valid"
  }
}
```

---

## Implementation Sequence

### Phase 1: Database and Types
1. Create database migrations for new tables
2. Add TypeScript interfaces for mastery types
3. Add `skill_weights` column to questions table

### Phase 2: Core Calculation Library
4. Create mastery calculation utilities (weights, scoring, decay)
5. Create `useStudentMastery` hook for individual tracking
6. Create `useClassAnalytics` hook for cohort aggregates

### Phase 3: AI Integration
7. Update `generate-graph` to output skill weights
8. Ensure mergeGraphs preserves weights during batch processing

### Phase 4: Data Entry UI
9. Create Class Manager panel
10. Create Student Selector component
11. Create manual Attempt Logger panel
12. Create Bulk Upload panel with CSV parsing

### Phase 5: Visualization
13. Update NodeDetailPanel with real mastery display
14. Add visual mastery indicators to GraphNode
15. Create Mastery Overview dashboard
16. Create Class Analytics panel

---

## CSV Upload Format

Example file structure:

```csv
student_id,student_name,question_text,is_correct,independence_level,attempted_at
STU001,Alice Smith,"What is 2+2?",true,independent,2026-02-01T10:30:00Z
STU001,Alice Smith,"Solve x+5=12",true,lightly_scaffolded,2026-02-01T10:35:00Z
STU002,Bob Jones,"What is 2+2?",false,independent,2026-02-01T11:00:00Z
```

The system will:
1. Parse CSV and validate structure
2. Match question_text to existing questions in graph
3. Auto-create students if not in class
4. Calculate mastery updates in batch
5. Show preview before committing

---

## Summary

This implementation provides:

- **Weighted scoring** based on AI-estimated cognitive demand per skill
- **Independence multiplier** rewarding independent performance
- **Wrong answer penalty** (20% of weight) to reflect meaningful data
- **Memory decay** using Ebbinghaus forgetting curve
- **Class/cohort support** with aggregate analytics
- **Two input methods**: manual entry and bulk CSV upload
- **Visual feedback** on graph nodes showing mastery and retention status

