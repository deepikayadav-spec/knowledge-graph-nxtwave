# Replace "New PF" graph skills & edges from curated CSVs

## Target

Graph: **New PF** (`f284056c-ad2a-4011-9f09-d9f1dd683417`)

## Verified

- CSV `graph_id` matches "New PF" — no remapping needed.
- **Skills:** 58 in CSV, 58 in DB. All 58 `skill_id`s are identical to what currently exists, and all 58 are the exact set referenced by the 891 questions in this graph → question→skill mappings remain valid after the swap.
- **Edges:** 69 in CSV (DB currently has 83; the curated set is a refined subset).
- **Subtopics:** All 30 `subtopic_id`s referenced in the CSV already exist in `skill_subtopics` for this graph → no FK breakage.
- Edge `relationship_type` is `requires` for all rows.

## Actions

Run as a single SQL transaction via the insert tool:

1. `DELETE FROM skill_edges WHERE graph_id = 'f284056c-...'`
2. `DELETE FROM skills WHERE graph_id = 'f284056c-...'`
3. Re-insert all 58 rows from `skills-export-2026-05-20_curated.csv` (preserving `id`, `skill_id`, `name`, `tier`, `level`, `description`, `transferable_contexts`, `created_at`, `subtopic_id`).
4. Re-insert all 69 rows from `skill_edges-export-2026-05-20_curated.csv` (preserving `id`, `from_skill`, `to_skill`, `relationship_type`, `reason`).

Use `COPY ... FROM STDIN` with `;` delimiter to load the CSVs verbatim into temp tables, then `INSERT ... SELECT` into the real tables. Mastery records (`student_kp_mastery`), questions, topics, and subtopics are untouched.

## Not changed

- Questions, skill_weights, student attempts, mastery, topics, subtopics, classes — all preserved.
- No schema/migration changes; this is a data swap only.

## Post-check

After load, verify counts: 58 skills, 69 edges for the graph, and re-run "referenced-but-missing" check to confirm no question references a deleted skill.
