

# Add Demo Students with Indian Names and Mastery Data to "New PF" Graph

## Overview

Seed the existing "New PF" graph's CS101 class with 8 Indian student names and pre-populate mastery scores across all 57 skills. This is purely a database seeding task -- no code changes needed.

## What Gets Created

### 8 Students (enrolled in existing CS101 class)

| Student ID | Name | Profile |
|------------|------|---------|
| STU001 | Aarav Sharma | High performer (~85% avg mastery) |
| STU002 | Priya Patel | Strong student (~75% avg) |
| STU003 | Rohan Gupta | Average performer (~60% avg) |
| STU004 | Ananya Reddy | Struggling (~40% avg, many expired) |
| STU005 | Vihaan Kumar | Decayed learner (~65% raw, but lots of aging) |
| STU006 | Ishita Nair | Improving beginner (~50% avg) |
| STU007 | Arjun Deshmukh | Mixed -- strong in loops, weak in OOP (~55%) |
| STU008 | Kavya Iyer | Top student (~90% avg, current retention) |

### Mastery Records

- 8 students x 57 skills = 456 mastery records in `student_kp_mastery`
- Each record will have varied `earned_points`, `max_points`, `raw_mastery`, `stability` (14-60 days), `retrieval_count`, and `last_reviewed_at` values
- Retention status will naturally vary based on stability and last review date (computed at query time by the app)

## Technical Details

### Step 1: Database Migration -- Insert Students

Insert 8 students into `class_students` table linked to the existing CS101 class (`05a17fb9-7975-4f98-88ea-98d09264af26`) in the "New PF" graph.

### Step 2: Database Migration -- Insert Mastery Records

Use a SQL script with `generate_series` and deterministic seed logic to create 456 `student_kp_mastery` rows. Each student profile will have a different mastery distribution:

- **High performers** (Aarav, Kavya): raw_mastery 0.7-1.0, stability 30-60 days, recent reviews
- **Average** (Priya, Rohan, Vihaan): raw_mastery 0.4-0.8, stability 14-40 days, mixed review dates
- **Struggling** (Ananya, Ishita): raw_mastery 0.2-0.5, stability 14-20 days, older reviews
- **Mixed** (Arjun): high mastery on loop/condition skills, low on OOP/recursion skills

The SQL will use the graph_id `f284056c-ad2a-4011-9f09-d9f1dd683417` and skill_ids from the existing `skills` table.

### No Code Changes

The existing demo data system and mastery hooks will automatically pick up these database records. When a teacher selects a student from the CS101 class, the app loads from `student_kp_mastery` and applies retention decay in real-time.

