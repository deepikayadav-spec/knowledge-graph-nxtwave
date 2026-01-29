import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface QuickQuestionInputProps {
  onGenerate: (courseName: string, questions: string[]) => void;
  isLoading: boolean;
}

export function QuickQuestionInput({ onGenerate, isLoading }: QuickQuestionInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [questionsText, setQuestionsText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!questionsText.trim() && !courseName.trim()) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [questionsText, courseName]);

  const handleSubmit = () => {
    if (!courseName.trim() || !questionsText.trim()) return;
    
    const questions = questionsText
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);
    
    if (questions.length === 0) return;
    
    onGenerate(courseName.trim(), questions);
    setCourseName('');
    setQuestionsText('');
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit();
    }
  };

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsExpanded(true)}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <Send className="h-4 w-4" />
        Quick Add Questions
        <ChevronDown className="h-3 w-3" />
      </Button>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col gap-2 p-3 rounded-lg border border-border bg-card shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-200"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Quick Add Questions</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsExpanded(false)}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>
      
      <Input
        placeholder="Course name (e.g., 'Calculus 101')"
        value={courseName}
        onChange={(e) => setCourseName(e.target.value)}
        className="h-9 text-sm"
        onKeyDown={handleKeyDown}
      />
      
      <Textarea
        placeholder="Enter questions (one per line)&#10;e.g.:&#10;What is a derivative?&#10;How do you integrate by parts?"
        value={questionsText}
        onChange={(e) => setQuestionsText(e.target.value)}
        className="min-h-[80px] text-sm resize-none"
        onKeyDown={handleKeyDown}
      />
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {questionsText.split('\n').filter(q => q.trim()).length} question(s) · ⌘+Enter to submit
        </span>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isLoading || !courseName.trim() || !questionsText.trim()}
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
              Generate Graph
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
