

# Fix: Support Multi-line Questions with Blank Line Separator

## Problem
Currently, both `QuestionInputPanel.tsx` and `QuickQuestionInput.tsx` split input by single newlines:
```typescript
const questions = questionsText
  .split('\n')
  .map(q => q.trim())
  .filter(q => q.length > 0);
```

This means a 13-question input with multi-line descriptions gets split into 65+ "questions" (one per line).

## Solution
Use **double newlines (blank lines)** as question separators. This allows:
- Multi-line question descriptions
- Natural text formatting
- Clear visual separation between questions

**New parsing logic:**
```typescript
const questions = questionsText
  .split(/\n\s*\n/)  // Split on blank lines (one or more empty lines)
  .map(q => q.trim())
  .filter(q => q.length > 0);
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/panels/QuestionInputPanel.tsx` | Update split logic and placeholder text |
| `src/components/panels/QuickQuestionInput.tsx` | Update split logic and placeholder text |

---

## Detailed Changes

### 1. QuestionInputPanel.tsx

**Line 83-86** - Update parsing:
```typescript
const questions = questionsText
  .split(/\n\s*\n/)  // Split on blank lines
  .map(q => q.trim())
  .filter(q => q.length > 0);
```

**Line 163** - Update question count display:
```typescript
const questionCount = questionsText.split(/\n\s*\n/).filter(q => q.trim().length > 0).length;
```

**Lines 186-200** - Update UI text and placeholder:
```typescript
<label>
  Coding Questions (separate with blank lines)
</label>
<Textarea
  placeholder={`Write a function that checks if a key exists in a dictionary.
The function should handle nested dictionaries and return True/False.

Implement a function to count word frequencies in a text.
It should ignore case and punctuation.

Create a function that merges two sorted lists into one sorted list.`}
  ...
/>
<p>
  Separate each question with a blank line. Multi-line descriptions are supported.
</p>
```

### 2. QuickQuestionInput.tsx

**Lines 20-23** - Update parsing:
```typescript
const questions = questionsText
  .split(/\n\s*\n/)
  .map(q => q.trim())
  .filter(q => q.length > 0);
```

**Line 58 & 103** - Update question count:
```typescript
{questionsText.split(/\n\s*\n/).filter(q => q.trim()).length} question(s)
```

**Lines 43-49** - Update placeholder and instructions:
```typescript
<p className="text-muted-foreground">
  Enter coding questions below (separate with blank lines)
</p>

<Textarea
  placeholder="Write a function to check if a key exists...&#10;Include nested dictionary support.&#10;&#10;Implement frequency counting...&#10;Handle edge cases like empty strings."
/>
```

---

## Example Input Format

**Before (broken):**
```
Write a function that checks if a key exists in a dictionary
The function should handle nested dictionaries
and return True or False
```
This was parsed as **3 separate questions**.

**After (correct):**
```
Write a function that checks if a key exists in a dictionary.
The function should handle nested dictionaries
and return True or False.

Implement a function to count word frequencies.
It should ignore case and punctuation.
```
This is correctly parsed as **2 questions**.

---

## Testing
After implementation:
1. Enter your 13 questions with blank lines between them
2. Verify the question count shows "13 question(s)"
3. Generate the graph and confirm only 13 questions are sent to the API

