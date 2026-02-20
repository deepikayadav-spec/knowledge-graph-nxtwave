

# Multi-File Upload Support

## Current Behavior
The file input (`<input type="file">`) only accepts a single file at a time. Each upload replaces the textarea content with the new file's questions.

## Changes

### File: `src/components/panels/QuickQuestionInput.tsx`

1. **Add `multiple` attribute** to both file input elements (lines 389-394 and 484-489):
   ```html
   <input type="file" accept=".txt,.csv,.pdf,.json" multiple ... />
   ```

2. **Update `handleFileUpload`** to loop through all selected files:
   - Change from `e.target.files?.[0]` to iterating over `e.target.files`
   - For each file: parse questions using the existing logic (CSV, JSON, PDF, or plain text)
   - **Accumulate** all questions from all files, then append them to the existing textarea content (so uploading 3 files adds all their questions together)
   - Show a single toast summarizing total questions found across all files
   - PDF files will be processed sequentially (each requires async extraction)
   - File size check applies per file

3. **Update button label** from "Upload File" to "Upload Files" in both landing and collapsible modes.

### File: `src/components/mastery/BulkUploadPanel.tsx`

No changes needed here -- CSV bulk upload for student attempts is a different workflow that processes one file at a time intentionally (validation + confirmation step).

### Technical Details

The updated `handleFileUpload` function will:
- Collect all files from `e.target.files`
- Process non-PDF files in parallel using `Promise.all`
- Process PDF files sequentially (they invoke an edge function)
- Concatenate all parsed questions with `\n\n` separators
- Append to existing textarea content (preserving previously loaded questions)
- Trigger the duplicate check automatically via the existing `useEffect` on `questionsText`

