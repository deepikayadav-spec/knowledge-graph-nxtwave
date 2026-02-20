import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Send, Loader2, Plus, ChevronDown, Upload, Check, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { extractCoreQuestion } from '@/lib/question/extractCore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type DomainType = 'python' | 'web';

interface QuickQuestionInputProps {
  onGenerate: (questions: string[], domain: DomainType) => void;
  isLoading: boolean;
  isLandingMode?: boolean;
  graphId?: string | null;
}

function parseQuestionsFromText(text: string): string[] {
  // Check if structured "Question:" headers exist
  const hasQuestionHeaders = /^Question\s*:?\s*$/im.test(text);
  
  if (hasQuestionHeaders) {
    const parts = text.split(/(?=^Question\s*:?\s*$)/im);
    return parts
      .map((q, i) => {
        const trimmed = q.trim();
        // If this fragment doesn't contain a "Question:" header,
        // it's a leading topic line -- prepend it to the next fragment
        if (i < parts.length - 1 && !/^Question\s*:?\s*$/im.test(trimmed)) {
          parts[i + 1] = trimmed + '\n\n' + parts[i + 1];
          return '';
        }
        return trimmed;
      })
      .filter(q => q.length > 0);
  }
  
  // Free-form: split on double-newline gaps
  return text
    .split(/\n\s*\n/)
    .map(q => q.trim())
    .filter(q => q.length > 10); // Filter out very short fragments
}

function parseCSV(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return [];
  
  const header = lines[0].toLowerCase();
  const hasExpectedColumns = header.includes('question') || header.includes('input') || header.includes('output');
  
  if (!hasExpectedColumns) {
    return lines;
  }
  
  const questions: string[] = [];
  const headerCols = lines[0].split(',').map(h => h.trim().toLowerCase());
  const qIdx = headerCols.findIndex(h => h.includes('question'));
  const iIdx = headerCols.findIndex(h => h.includes('input'));
  const oIdx = headerCols.findIndex(h => h.includes('output'));
  const eIdx = headerCols.findIndex(h => h.includes('explanation'));
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    let q = 'Question:\n';
    if (qIdx >= 0 && cols[qIdx]) q += cols[qIdx] + '\n\n';
    if (iIdx >= 0 && cols[iIdx]) q += 'Input:\n' + cols[iIdx] + '\n\n';
    if (oIdx >= 0 && cols[oIdx]) q += 'Output:\n' + cols[oIdx] + '\n\n';
    if (eIdx >= 0 && cols[eIdx]) q += 'Explanation:\n' + cols[eIdx];
    questions.push(q.trim());
  }
  
  return questions;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    textParts.push(pageText);
  }
  
  return textParts.join('\n\n');
}

interface DuplicateCheck {
  newCount: number;
  duplicateCount: number;
  isChecking: boolean;
}

const PYTHON_PLACEHOLDER = `Topic: Loops

Question:
Print numbers from 1 to N.

Input:
An integer N.

Output:
Numbers 1 to N on separate lines.

Explanation:
Use a for loop with range.

Question:
Print even numbers from 1 to N.

Input:
An integer N.

Output:
Even numbers from 1 to N.

Explanation:
Use a for loop with a condition or step.`;

const WEB_PLACEHOLDER = `Create a responsive navigation bar with a hamburger menu for mobile. The nav should have links to Home, About, and Contact pages.

Build a form with name, email, and message fields. Add client-side validation that shows error messages for empty fields and invalid email format.

Create a React component that fetches data from an API and displays it in a card layout with loading and error states.`;

export function QuickQuestionInput({ onGenerate, isLoading, isLandingMode = false, graphId }: QuickQuestionInputProps) {
  const [questionsText, setQuestionsText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [domain, setDomain] = useState<DomainType>('python');
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheck>({ newCount: 0, duplicateCount: 0, isChecking: false });

  const getCurrentQuestions = () =>
    parsedQuestions.length > 0 ? parsedQuestions : parseQuestionsFromText(questionsText);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced duplicate checking
  useEffect(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    const questions = getCurrentQuestions();
    
    if (questions.length === 0 || !graphId) {
      setDuplicateCheck({ newCount: 0, duplicateCount: 0, isChecking: false });
      return;
    }

    setDuplicateCheck(prev => ({ ...prev, isChecking: true }));

    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const { data: existingQuestions, error } = await supabase
          .from('questions')
          .select('question_text')
          .eq('graph_id', graphId);

        if (error) {
          console.warn('Failed to check for duplicates:', error);
          setDuplicateCheck({ newCount: questions.length, duplicateCount: 0, isChecking: false });
          return;
        }

        const existingTexts = new Set(
          (existingQuestions || []).map(q => extractCoreQuestion(q.question_text))
        );

        let duplicateCount = 0;
        for (const question of questions) {
          const coreQuestion = extractCoreQuestion(question);
          if (existingTexts.has(coreQuestion)) {
            duplicateCount++;
          }
        }

        setDuplicateCheck({
          newCount: questions.length - duplicateCount,
          duplicateCount,
          isChecking: false,
        });
      } catch {
        setDuplicateCheck({ newCount: questions.length, duplicateCount: 0, isChecking: false });
      }
    }, 500);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [questionsText, graphId, parsedQuestions]);

  const handleSubmit = () => {
    if (!questionsText.trim()) return;
    
    const questions = getCurrentQuestions();
    if (questions.length === 0) return;
    
    onGenerate(questions, domain);
    setQuestionsText('');
    setParsedQuestions([]);
    setIsOpen(false);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate file sizes
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `"${file.name}" exceeds the 5MB limit.`,
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }
    }

    const allQuestions: string[] = [];
    const pdfFiles: File[] = [];
    const textFiles: File[] = [];

    for (const file of Array.from(files)) {
      if (file.name.endsWith('.pdf')) {
        pdfFiles.push(file);
      } else {
        textFiles.push(file);
      }
    }

    // Process text/CSV/JSON files in parallel
    if (textFiles.length > 0) {
      const textResults = await Promise.all(
        textFiles.map(
          (file) =>
            new Promise<string[]>((resolve) => {
              const reader = new FileReader();
              reader.onload = (event) => {
                const text = event.target?.result as string;
                let questions: string[] = [];

                if (file.name.endsWith('.csv')) {
                  questions = parseCSV(text);
                } else {
                  try {
                    const parsed = JSON.parse(text);
                    if (Array.isArray(parsed)) {
                      questions = parsed.map(q => {
                        if (typeof q === 'string') return q;

                        const content = q.question_content || q.question || q.text || '';
                        if (!content) return JSON.stringify(q);

                        let result = '';
                        if (q.subtopic) {
                          result += `Topic: ${q.subtopic}\n\n`;
                        } else if (q.topic) {
                          result += `Topic: ${q.topic}\n\n`;
                        }

                        result += 'Question:\n';
                        result += content;

                        if (q.test_cases && Array.isArray(q.test_cases) && q.test_cases.length > 0) {
                          result += '\n\nTest Cases:';
                          for (const tc of q.test_cases) {
                            const weight = tc.weightage ? ` (weight: ${tc.weightage})` : '';
                            result += `\n- ${tc.display_text || tc.description || tc.text}${weight}`;
                          }
                        }

                        return result.trim();
                      }).filter(q => q.length > 0);
                    } else {
                      questions = parseQuestionsFromText(text);
                    }
                  } catch {
                    questions = parseQuestionsFromText(text);
                  }
                }

                resolve(questions);
              };
              reader.readAsText(file);
            })
        )
      );

      for (const questions of textResults) {
        allQuestions.push(...questions);
      }
    }

    // Process PDF files sequentially
    if (pdfFiles.length > 0) {
      setIsExtractingPdf(true);
      try {
        for (const file of pdfFiles) {
          const rawText = await extractTextFromPdf(file);

          if (rawText.trim().length < 20) {
            toast({
              title: "Could not extract text",
              description: `"${file.name}" appears to be image-based or empty.`,
              variant: "destructive",
            });
            continue;
          }

          toast({
            title: "Extracting questions...",
            description: `Using AI to identify questions from "${file.name}".`,
          });

          const { data, error } = await supabase.functions.invoke('extract-questions', {
            body: { text: rawText, domain },
          });

          if (error) {
            console.error('PDF extraction error:', error);
            toast({
              title: "PDF extraction failed",
              description: `Failed to extract from "${file.name}".`,
              variant: "destructive",
            });
            continue;
          }

          if (data?.questions && data.questions.length > 0) {
            allQuestions.push(...data.questions);
          }
        }
      } finally {
        setIsExtractingPdf(false);
      }
    }

    if (allQuestions.length === 0) {
      toast({
        title: "No questions found",
        description: "Could not parse questions from the selected file(s).",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    toast({
      title: "Files loaded",
      description: `Found ${allQuestions.length} question(s) across ${files.length} file(s). Click Generate to process.`,
    });

    // Append to existing content
    setParsedQuestions(prev => [...prev, ...allQuestions]);
    setQuestionsText(prev => {
      const trimmed = prev.trim();
      return trimmed ? trimmed + '\n\n' + allQuestions.join('\n\n') : allQuestions.join('\n\n');
    });

    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit();
    }
  };

  const questionCount = getCurrentQuestions().length;
  const placeholder = domain === 'web' ? WEB_PLACEHOLDER : PYTHON_PLACEHOLDER;

  const DomainSelector = ({ compact = false }: { compact?: boolean }) => (
    <Select value={domain} onValueChange={(v) => setDomain(v as DomainType)}>
      <SelectTrigger className={cn(compact ? "h-7 text-xs w-[140px]" : "w-[180px]")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="python">Python</SelectItem>
        <SelectItem value="web">HTML/CSS/JS/React/AI</SelectItem>
      </SelectContent>
    </Select>
  );

  if (isLandingMode) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Build Your Knowledge Graph</h2>
            <p className="text-muted-foreground">
              Enter coding questions or upload a file (TXT, CSV, PDF). Use "Topic:" headers to group by topic.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.pdf,.json"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <div className="flex items-center gap-2 justify-center">
            <span className="text-sm text-muted-foreground">Domain:</span>
            <DomainSelector />
          </div>

          <Textarea
            placeholder={placeholder}
            value={questionsText}
            onChange={(e) => { setQuestionsText(e.target.value); setParsedQuestions([]); }}
            className="min-h-[200px] text-sm resize-none font-mono"
            onKeyDown={handleKeyDown}
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {(duplicateCheck.isChecking || isExtractingPdf) ? (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {isExtractingPdf ? 'Extracting PDF...' : 'Checking...'}
                  </span>
                ) : questionCount > 0 && graphId ? (
                  <>
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      {duplicateCheck.newCount} new
                    </Badge>
                    {duplicateCheck.duplicateCount > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {duplicateCheck.duplicateCount} duplicate
                      </Badge>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {questionCount} question(s)
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
                disabled={isExtractingPdf}
              >
                {isExtractingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload Files
              </Button>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || isExtractingPdf || !questionsText.trim()}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Graph...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Generate Knowledge Graph
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        ref={containerRef}
        className={cn(
          "rounded-lg border border-border bg-card shadow-lg overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.pdf,.json"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />

        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between gap-2 p-3 hover:bg-muted/50 transition-colors">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add More Questions
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <DomainSelector compact />
            </div>
            <Textarea
              placeholder={domain === 'web' 
                ? `Create a responsive card layout using CSS Grid...\n\nBuild a React todo app with add/delete functionality...`
                : `Topic: Lists\n\nQuestion:\n...\n\nInput:\n...\n\nOutput:\n...\n\nExplanation:\n...`
              }
              value={questionsText}
              onChange={(e) => { setQuestionsText(e.target.value); setParsedQuestions([]); }}
              className="min-h-[80px] text-sm resize-none font-mono"
              onKeyDown={handleKeyDown}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(duplicateCheck.isChecking || isExtractingPdf) ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {isExtractingPdf ? 'PDF...' : 'Checking...'}
                  </span>
                ) : questionCount > 0 && graphId ? (
                  <>
                    <Badge variant="default" className="text-xs h-5 gap-1">
                      <Check className="h-2.5 w-2.5" />
                      {duplicateCheck.newCount} new
                    </Badge>
                    {duplicateCheck.duplicateCount > 0 && (
                      <Badge variant="secondary" className="text-xs h-5 gap-1">
                        <AlertCircle className="h-2.5 w-2.5" />
                        {duplicateCheck.duplicateCount} dup
                      </Badge>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {questionCount} question(s)
                  </span>
                )}
                <span className="text-xs text-muted-foreground">⌘+Enter</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-6 px-2 text-xs"
                  disabled={isExtractingPdf}
                >
                  {isExtractingPdf ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3 mr-1" />
                  )}
                  Upload
                </Button>
              </div>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isLoading || isExtractingPdf || !questionsText.trim()}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Add to Graph
                  </>
                )}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
