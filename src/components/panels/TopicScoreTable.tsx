import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { TopicScoreRange } from '@/types/grouping';
import { getGradeBoundaries } from '@/lib/mastery/gradeScale';

interface TopicScoreTableProps {
  topicScoreRanges: TopicScoreRange[];
  onRecalculate: () => void;
  isRecalculating?: boolean;
}

export function TopicScoreTable({ topicScoreRanges, onRecalculate, isRecalculating }: TopicScoreTableProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  if (topicScoreRanges.length === 0) return null;

  const toggleExpand = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  return (
    <div className="w-[280px] shrink-0 border-l border-border bg-card/50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-xs font-semibold text-foreground">Topic Scores & Grades</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRecalculate}
          disabled={isRecalculating}
        >
          <RefreshCw className={`h-3 w-3 ${isRecalculating ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] h-8 px-2">Topic</TableHead>
              <TableHead className="text-[10px] h-8 px-2 text-right">Max</TableHead>
              <TableHead className="text-[10px] h-8 px-2 text-right">Qs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topicScoreRanges.map(range => {
              const isExpanded = expandedTopics.has(range.topicId);
              const boundaries = getGradeBoundaries(range.maxScore);
              return (
                <>
                  <TableRow
                    key={range.topicId}
                    className="cursor-pointer"
                    onClick={() => toggleExpand(range.topicId)}
                  >
                    <TableCell className="text-[11px] px-2 py-1.5 max-w-[140px]">
                      <div className="flex items-center gap-1">
                        {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                        <span className="truncate" title={range.topicName}>{range.topicName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] px-2 py-1.5 text-right font-medium">
                      {range.maxScore}
                    </TableCell>
                    <TableCell className="text-[11px] px-2 py-1.5 text-right text-muted-foreground">
                      {range.uniqueQuestions}
                    </TableCell>
                  </TableRow>
                  {isExpanded && boundaries.map(b => (
                    <TableRow key={`${range.topicId}-${b.grade}`} className="bg-muted/30">
                      <TableCell colSpan={2} className="text-[10px] px-2 py-1 pl-7">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className="text-[9px] px-1.5 py-0 h-4 font-bold border-0"
                            style={{ backgroundColor: b.color, color: '#fff' }}
                          >
                            {b.grade}
                          </Badge>
                          <span className="text-muted-foreground">{b.minScore}+</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[10px] px-2 py-1 text-right text-muted-foreground">
                        {b.grade === 'F' ? `0–${boundaries[boundaries.length - 2].minScore - 1}` : `${b.minScore}–${range.maxScore}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
