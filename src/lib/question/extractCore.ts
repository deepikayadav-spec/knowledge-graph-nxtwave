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
    // Find the question text (before Input/Output/Explanation)
    for (let i = questionStartIdx; i < lines.length; i++) {
      const line = lines[i];
      // Stop at section headers
      if (/^(Input|Output|Explanation)\s*:?\s*$/i.test(line)) break;
      if (line.length > 0) return line.toLowerCase();
    }
  }
  
  // Fallback for plain text questions (no headers)
  // Return first non-empty line that isn't a header
  return lines.find(l => 
    !/^(Question|Input|Output|Explanation)\s*:?\s*$/i.test(l)
  )?.toLowerCase() || fullBlock.trim().toLowerCase();
}
