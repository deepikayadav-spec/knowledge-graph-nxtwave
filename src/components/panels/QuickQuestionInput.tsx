import { useState, useRef } from 'react';
import { Send, Loader2, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface QuickQuestionInputProps {
  onGenerate: (questions: string[]) => void;
  isLoading: boolean;
  isLandingMode?: boolean;
}

export function QuickQuestionInput({ onGenerate, isLoading, isLandingMode = false }: QuickQuestionInputProps) {
  const [questionsText, setQuestionsText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    if (!questionsText.trim()) return;
    
    const questions = questionsText
      .split(/\[QUESTION\]/i)  // Split on [QUESTION] markers
      .map(q => q.trim())
      .filter(q => q.length > 0);
    
    if (questions.length === 0) return;
    
    onGenerate(questions);
    setQuestionsText('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit();
    }
  };

  if (isLandingMode) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Build Your Knowledge Graph</h2>
            <p className="text-muted-foreground">
              Enter structured coding questions using [QUESTION] markers. Add more questions anytime to expand the graph.
            </p>
          </div>
          
          <Textarea
            placeholder={`[QUESTION]
Problem:
Write a function to check if a key exists in a nested dictionary.

Input:
A dictionary (may contain nested dicts) and a target key string.

Output:
True if key exists at any nesting level, False otherwise.

Constraints:
- Max nesting depth: 10 levels
- Keys are always strings

Examples:
{"a": {"b": 1}}, "b" → True
{"x": 1}, "y" → False

[QUESTION]
Problem:
Count word frequencies in a given text.
...`}
            value={questionsText}
            onChange={(e) => setQuestionsText(e.target.value)}
            className="min-h-[200px] text-sm resize-none font-mono"
            onKeyDown={handleKeyDown}
          />
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {questionsText.split(/\[QUESTION\]/i).filter(q => q.trim()).length} question(s)
            </span>
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
              placeholder={`[QUESTION]\nProblem:\n...\n\nInput:\n...\n\nOutput:\n...`}
              value={questionsText}
              onChange={(e) => setQuestionsText(e.target.value)}
              className="min-h-[80px] text-sm resize-none font-mono"
              onKeyDown={handleKeyDown}
            />
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {questionsText.split(/\[QUESTION\]/i).filter(q => q.trim()).length} question(s) · ⌘+Enter to submit
              </span>
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
