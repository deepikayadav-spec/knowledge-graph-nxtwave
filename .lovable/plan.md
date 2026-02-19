

# Support All Coding Domains + PDF Upload

## What We're Building

1. **Domain-aware generation** -- the system works for Python, HTML/CSS, JavaScript, Dynamic JS, React JS, and Gen AI questions (not just Python)
2. **PDF upload** -- extract questions from unstructured PDFs using AI

## Changes

### 1. Add Domain Selector to UI

Add a dropdown to `QuickQuestionInput.tsx` with these options:
- **Python** (default -- current behavior)
- **HTML/CSS/JS** (covers HTML, CSS, JavaScript, Dynamic JS, React JS, Gen AI)

The selected domain flows through: `QuickQuestionInput` -> `KnowledgeGraphApp.handleGenerate` -> `useBatchGeneration.generate` -> `generate-graph` edge function.

The placeholder text updates based on domain selection. For HTML/CSS/JS, the placeholder shows a free-form question example instead of the structured Input/Output format.

### 2. Flexible Question Parsing

Update `parseQuestionsFromText()` in `QuickQuestionInput.tsx` to handle free-form text:
- If `Question:` headers exist, use current structured parser
- If no `Question:` headers, split on double-newline gaps (each block = one question)

This handles HTML/CSS questions that are just text descriptions without structured headers.

### 3. Create `extract-questions` Edge Function

New edge function that accepts raw text (from a PDF) and uses AI to:
- Identify individual question boundaries in messy, unformatted text
- Strip metadata (course IDs, timestamps, table formatting)
- Return clean question blocks as a JSON array

### 4. PDF Upload Support in UI

- Add `pdfjs-dist` dependency for client-side PDF-to-text extraction
- Update file input to accept `.pdf` and `.json` files (in addition to `.txt`, `.csv`)
- When PDF uploaded: extract text client-side -> send to `extract-questions` edge function -> populate textarea with cleaned questions for user review
- When JSON uploaded: parse array of question objects directly

### 5. Make `generate-graph` Edge Function Domain-Aware

The current system prompt, skill catalog, curriculum sequence, SKILL_TOPIC_MAP, MANDATORY_EDGES, and INDEPENDENT_FOUNDATIONAL are all Python-specific. Restructure as:

**Move all Python-specific config into a `PYTHON_CONFIG` object** (no content changes, just reorganization):
- Skill catalog (foundational/core/applied/advanced)
- Scope constraint
- Curriculum sequence (17 topics)
- SKILL_TOPIC_MAP
- INDEPENDENT_FOUNDATIONAL
- MANDATORY_EDGES
- Example IPA analysis

**Create a `WEB_CONFIG` object** for HTML/CSS/JS/React/GenAI:
- Minimal skill catalog (broad categories so the AI has naming guidance, not restrictive)
- Scope constraint: "Web development course covering HTML, CSS, JavaScript, Dynamic Web Apps, React, and Generative AI"
- No curriculum sequence yet (you said you'll provide topics later)
- Empty SKILL_TOPIC_MAP and MANDATORY_EDGES (no topic filtering until you provide the sequence)
- Empty INDEPENDENT_FOUNDATIONAL (no enforcement yet)
- Updated input format description: "Questions may be structured (with Input/Output) OR free-form text descriptions of design/coding tasks"
- Web-specific example IPA analysis using an HTML/CSS question

**Dynamic prompt assembly**: The edge function reads `domain` from the request body and selects the matching config. All shared logic (IPA/LTA methodology, output format, quality validation, consolidation rules, test cases, incremental mode, skill weights) stays identical.

### 6. Pass Domain Through the Pipeline

| Component | Change |
|-----------|--------|
| `QuickQuestionInput.tsx` | Add domain state + dropdown, pass domain via `onGenerate(questions, domain)` |
| `KnowledgeGraphApp.tsx` | Update `handleGenerate` signature to accept domain, forward to `generate()` |
| `useBatchGeneration.ts` | Add `domain` parameter to `generate()`, include in edge function request body |
| `generate-graph/index.ts` | Read `domain` from body, select config, build prompt dynamically |

### 7. Config for `extract-questions` Edge Function

Add to `supabase/config.toml`:
```toml
[functions.extract-questions]
verify_jwt = false
```

## Technical Details

### Web Minimal Skill Catalog (starting point)

Since there's no curriculum sequence yet, the catalog is intentionally broad to guide naming only:

- **HTML**: `html_document_structure`, `html_elements`, `html_attributes`, `html_forms`, `html_tables`, `html_semantic_elements`
- **CSS**: `css_selectors`, `css_properties`, `css_box_model`, `css_flexbox`, `css_grid`, `css_positioning`, `css_responsive_design`, `css_media_queries`, `css_animations`, `css_transitions`
- **JavaScript**: `js_variables`, `js_operators`, `js_conditionals`, `js_loops`, `js_arrays`, `js_objects`, `js_functions`, `js_string_methods`, `js_dom_manipulation`, `js_event_handling`, `js_async_await`, `js_promises`, `js_fetch_api`, `js_modules`, `js_classes`, `js_error_handling`
- **React**: `react_components`, `react_jsx`, `react_state`, `react_props`, `react_effects`, `react_routing`, `react_lists_keys`
- **Gen AI**: `ai_prompt_engineering`, `ai_api_integration`, `ai_workflow_design`

The AI will map questions to these names first, and create new ones only if needed -- same logic as Python.

### `extract-questions` Edge Function

Accepts `{ text: string, domain?: string }`, returns `{ questions: string[] }`.

Uses Gemini Flash for speed. System prompt instructs the AI to:
- Find question boundaries in messy text
- Strip metadata tables, course IDs, timestamps
- Return each question as a clean text block
- Preserve any code snippets, image URLs, HTML markup within questions

### Files Created/Modified

| File | Action |
|------|--------|
| `src/components/panels/QuickQuestionInput.tsx` | Add domain selector, update parser, add PDF/JSON upload |
| `src/components/KnowledgeGraphApp.tsx` | Forward domain through handleGenerate |
| `src/hooks/useBatchGeneration.ts` | Accept domain param, pass to edge function |
| `supabase/functions/generate-graph/index.ts` | Restructure into domain configs, dynamic prompt assembly |
| `supabase/functions/extract-questions/index.ts` | **New** -- AI-powered PDF question extraction |

### What Stays the Same

- All existing Python KGs completely unaffected
- Python prompt content identical (reorganized into config object)
- Database schema unchanged
- Mastery calculations, retention decay, auto-group -- all unchanged
- When you provide the web topic sequence later, we add it to WEB_CONFIG just like Python has today

