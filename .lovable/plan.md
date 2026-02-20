

# Fix: Reliable Question Count for All File Types

## Problem

After file upload, questions are stored only as formatted text in the textarea. Three places then re-parse that text using `parseQuestionsFromText()`, which splits on `Question:` headers or double-newlines. Rich HTML/markdown content inside questions creates false split points, producing wrong counts and corrupted question data on submission.

Affected lines in `src/components/panels/QuickQuestionInput.tsx`:
- Line 154: duplicate check uses re-parsed text
- Line 208: submit uses re-parsed text (sends wrong data!)
- Line 382: UI badge uses re-parsed text

## Solution

Add a `parsedQuestions` state array that stores the reliable file-parsed results directly.

### File: `src/components/panels/QuickQuestionInput.tsx`

1. **Add new state** (near line 139):
   ```typescript
   const [parsedQuestions, setParsedQuestions] = useState<string[]>([]);
   ```

2. **In `handleFileUpload`** (after line 370): also store the reliable array:
   ```typescript
   setParsedQuestions(prev => [...prev, ...allQuestions]);
   ```

3. **Create a helper** to get the current reliable question list:
   ```typescript
   const getCurrentQuestions = () =>
     parsedQuestions.length > 0 ? parsedQuestions : parseQuestionsFromText(questionsText);
   ```

4. **Update line 154** (duplicate check `useEffect`):
   - Change `parseQuestionsFromText(questionsText)` to `getCurrentQuestions()`
   - Add `parsedQuestions` to the dependency array

5. **Update line 208** (submit handler):
   - Change `parseQuestionsFromText(questionsText)` to `getCurrentQuestions()`

6. **Update line 382** (UI question count):
   - Change to use `getCurrentQuestions().length`

7. **Clear `parsedQuestions` on manual textarea edit** (line 425 onChange handler):
   - When the user types manually, clear the cached array so it falls back to text parsing:
   ```typescript
   onChange={(e) => {
     setQuestionsText(e.target.value);
     setParsedQuestions([]);
   }}
   ```
   - Apply the same change to the collapsible-mode textarea as well.

8. **Clear `parsedQuestions` on submit** (line 212):
   - Add `setParsedQuestions([])` alongside `setQuestionsText('')`

### Why This Works for All Files

- JSON files: the array comes directly from `JSON.parse` -- always correct regardless of content complexity
- CSV files: the array comes from `parseCSV` -- structured extraction, also reliable
- PDF files: the array comes from the AI extraction edge function -- already an array
- Plain text files: falls through to `parseQuestionsFromText` which is fine for simple text
- Manual typing: `parsedQuestions` is empty, so it naturally falls back to text parsing

No changes needed outside this single file.

