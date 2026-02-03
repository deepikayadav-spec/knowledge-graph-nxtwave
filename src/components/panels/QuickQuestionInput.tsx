import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Send, Loader2, Plus, ChevronDown, Upload, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface QuickQuestionInputProps {
  onGenerate: (questions: string[]) => void;
  isLoading: boolean;
  isLandingMode?: boolean;
  graphId?: string | null;
}

function parseQuestionsFromText(text: string): string[] {
  return text
    .split(/(?=^Question\s*:?\s*$)/im)
    .map(q => q.trim())
    .filter(q => q.length > 0);
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

interface DuplicateCheck {
  newCount: number;
  duplicateCount: number;
  isChecking: boolean;
}

export function QuickQuestionInput({ onGenerate, isLoading, isLandingMode = false, graphId }: QuickQuestionInputProps) {
  const [questionsText, setQuestionsText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheck>({ newCount: 0, duplicateCount: 0, isChecking: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced duplicate checking
  useEffect(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    const questions = parseQuestionsFromText(questionsText);
    
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
          (existingQuestions || []).map(q => q.question_text.trim().toLowerCase())
        );

        let duplicateCount = 0;
        for (const question of questions) {
          if (existingTexts.has(question.trim().toLowerCase())) {
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
    }, 500); // 500ms debounce

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [questionsText, graphId]);

  const handleSubmit = () => {
    if (!questionsText.trim()) return;
    
    const questions = parseQuestionsFromText(questionsText);
    if (questions.length === 0) return;
    
    onGenerate(questions);
    setQuestionsText('');
    setIsOpen(false);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 1MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      let questions: string[] = [];

      if (file.name.endsWith('.csv')) {
        questions = parseCSV(text);
      } else {
        questions = parseQuestionsFromText(text);
      }

      if (questions.length === 0) {
        toast({
          title: "No questions found",
          description: "Could not parse questions from the file. Use 'Question:' delimiters or CSV format.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "File loaded",
        description: `Found ${questions.length} question(s). Click Generate to process.`,
      });

      setQuestionsText(questions.join('\n\n'));
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit();
    }
  };

  const questionCount = parseQuestionsFromText(questionsText).length;

  if (isLandingMode) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Build Your Knowledge Graph</h2>
            <p className="text-muted-foreground">
              Enter structured coding questions or upload a file. Separate multiple questions with "Question:".
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <Textarea
            placeholder={`Question:
Write a function to check if a key exists in a nested dictionary.

Input:
A dictionary (may contain nested dicts) and a target key string.

Output:
True if key exists at any nesting level, False otherwise.

Explanation:
Use recursion to traverse nested dictionaries, checking each level for the target key.

Question:
Count word frequencies in a given text.

Input:
A string of text.

Output:
A dictionary with word counts.

Explanation:
Split by spaces, iterate and count using a dictionary.`}
            value={questionsText}
            onChange={(e) => setQuestionsText(e.target.value)}
            className="min-h-[200px] text-sm resize-none font-mono"
            onKeyDown={handleKeyDown}
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {duplicateCheck.isChecking ? (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking...
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
              >
                <Upload className="h-4 w-4" />
                Upload File
              </Button>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !questionsText.trim()}
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
          accept=".txt,.csv"
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
            <Textarea
              placeholder={`Question:\n...\n\nInput:\n...\n\nOutput:\n...\n\nExplanation:\n...`}
              value={questionsText}
              onChange={(e) => setQuestionsText(e.target.value)}
              className="min-h-[80px] text-sm resize-none font-mono"
              onKeyDown={handleKeyDown}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {duplicateCheck.isChecking ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking...
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
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </Button>
              </div>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isLoading || !questionsText.trim()}
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
