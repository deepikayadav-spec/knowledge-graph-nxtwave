

# Fix Two Issues: Fingerprinting Accuracy + Collapsible Panel Visibility

## Issue 1: Improve Fingerprinting (reduces false "missing" count)

The `extractCoreQuestion` stop regex currently only breaks on exact section headers like `Input:` or `Output:`. But many DB questions contain headers like `Input Format`, `Sample Input`, `Expected Output`, `Constraints`, etc. These leak into the fingerprint, causing mismatches.

### Changes to `src/lib/question/extractCore.ts` (and the duplicate in the edge function):

1. **Strip markdown bold** (`**text**`) and inline code backticks
2. **Skip horizontal rules** (`---`)
3. **Expand stop regex** from:
   `^(Input|Output|Explanation|Test Cases|Resources):?$`
   to:
   `^(Input|Output|Explanation|Test Cases|Resources|Sample Input|Sample Output|Expected Output|Input Format|Output Format|Constraints|Example|Note|Approach|Hint)`
   (using starts-with match instead of exact match, so `Input Format:` and `Input:` both trigger the stop)

4. Apply the same changes to `supabase/functions/find-missing-questions/index.ts`

## Issue 2: Make "Add to Graph" Button Visible in Collapsible Panel

The collapsible panel currently has everything crammed into a single row (`flex items-center justify-between`), so the "Add to Graph" button gets pushed off-screen or becomes hard to see.

### Changes to `src/components/panels/QuickQuestionInput.tsx`:

1. **Change the bottom controls layout** from a single cramped row to a stacked layout:
   - Top row: duplicate badges + upload/find-missing buttons
   - Bottom row: "Add to Graph" button at full width or right-aligned with more breathing room
2. **Increase minimum height** of the textarea from `min-h-[80px]` to `min-h-[120px]` for better visibility
3. **Make the "Add to Graph" button more prominent** -- slightly larger with clear styling so it stands out

### Technical Details

**File: `src/lib/question/extractCore.ts`** -- Updated stop regex and added markdown stripping

**File: `supabase/functions/find-missing-questions/index.ts`** -- Same fingerprint changes mirrored

**File: `src/components/panels/QuickQuestionInput.tsx`** (lines 684-758):
- Wrap controls in a `flex flex-col gap-2` instead of single row
- Move "Add to Graph" button to its own row with `w-full` or `ml-auto` styling
- Increase textarea min-height

