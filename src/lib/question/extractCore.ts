/**
 * Extract the core question text from a structured block.
 * Produces a consistent fingerprint regardless of whether the text
 * comes from the database (plain) or a file import (with headers).
 */
export function extractCoreQuestion(fullBlock: string): string {
  // Strip HTML tags first (database often stores <br/> tags)
  const cleaned = fullBlock.replace(/<br\s*\/?>/gi, '\n');
  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l);

  const contentLines: string[] = [];

  for (let line of lines) {
    // Normalize: strip leading numbering like "1. ", "2. "
    line = line.replace(/^\d+\.\s+/, '');
    // Normalize: strip markdown headers like "## ", "### "
    line = line.replace(/^#+\s+/, '');
    // Strip markdown bold **text**
    line = line.replace(/\*\*(.+?)\*\*/g, '$1');
    // Strip inline code backticks
    line = line.replace(/`([^`]+)`/g, '$1');
    // Skip code fence lines (``` or ```language)
    if (/^```/.test(line)) continue;
    // Skip horizontal rules (---, ===, ***)
    if (/^[-=*]{3,}$/.test(line)) continue;
    // Collapse multiple whitespace into single space
    line = line.replace(/\s{2,}/g, ' ');

    // Skip "Topic: ..." lines entirely
    if (/^Topic\s*:\s*/i.test(line)) continue;

    // Skip bare "Question" or "Question:" header
    if (/^Question\s*:?\s*$/i.test(line)) continue;

    // Handle "Question: actual content..." on same line
    const inlineMatch = line.match(/^Question\s*:\s*(.+)/i);
    if (inlineMatch) {
      contentLines.push(inlineMatch[1]);
      continue;
    }

    // Stop at section headers (expanded, prefix-based match)
    if (/^(Input|Output|Explanation|Test Cases|Resources|Sample Input|Sample Output|Expected Output|Input Format|Output Format|Constraints|Example|Note|Approach|Hint)\s*:?\s*/i.test(line)) break;

    contentLines.push(line);
  }

  if (contentLines.length > 0) {
    return contentLines.join(' ').toLowerCase().substring(0, 500);
  }

  return fullBlock.trim().toLowerCase().substring(0, 500);
}
