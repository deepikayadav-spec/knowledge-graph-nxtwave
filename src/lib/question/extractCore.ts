/**
 * Extract the core question text from a structured block.
 * Handles multi-line formatted questions with sections like:
 * "Question\nWrite a program...\nInput\n...\nOutput\n..."
 * Returns just "write a program..." (lowercased) for comparison
 */
export function extractCoreQuestion(fullBlock: string): string {
  // Strip HTML tags first (database often stores <br/> tags)
  const cleaned = fullBlock.replace(/<br\s*\/?>/gi, '\n');
  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l);
  
  // Look for content after "Question:" or "Question"
  let questionStartIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^Question\s*:?\s*$/i.test(lines[i])) {
      questionStartIdx = i + 1;
      break;
    }
    // Handle "Question: Write a program..." on same line
    const match = lines[i].match(/^Question\s*:\s*(.+)/i);
    if (match) {
      return match[1].trim().toLowerCase();
    }
  }
  
  // If we found "Question" header, get the next non-header line
  if (questionStartIdx >= 0 && questionStartIdx < lines.length) {
    // Collect all content lines before section headers
    const contentLines: string[] = [];
    for (let i = questionStartIdx; i < lines.length; i++) {
      const line = lines[i];
      if (/^(Input|Output|Explanation|Test Cases)\s*:?\s*$/i.test(line)) break;
      if (line.length > 0) contentLines.push(line);
    }
    if (contentLines.length > 0) {
      return contentLines.join(' ').toLowerCase().substring(0, 500);
    }
  }
  
  // Fallback: collect all non-header lines
  const contentLines = lines.filter(l =>
    !/^(Question|Input|Output|Explanation|Test Cases|Topic)\s*:?\s*$/i.test(l)
  );
  return contentLines.join(' ').toLowerCase().substring(0, 500)
    || fullBlock.trim().toLowerCase();
}
