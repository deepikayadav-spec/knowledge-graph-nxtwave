import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TopicScoreRange } from '@/types/grouping';

interface TopicScoreTableProps {
  topicScoreRanges: TopicScoreRange[];
  onRecalculate: () => void;
  isRecalculating?: boolean;
}

export function TopicScoreTable({ topicScoreRanges, onRecalculate, isRecalculating }: TopicScoreTableProps) {
  if (topicScoreRanges.length === 0) return null;

  return (
    <div className="w-[250px] shrink-0 border-l border-border bg-card/50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-xs font-semibold text-foreground">Topic Scores</h3>
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
              <TableHead className="text-[10px] h-8 px-2 text-right">Min</TableHead>
              <TableHead className="text-[10px] h-8 px-2 text-right">Max</TableHead>
              <TableHead className="text-[10px] h-8 px-2 text-right">Qs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topicScoreRanges.map(range => (
              <TableRow key={range.topicId}>
                <TableCell className="text-[11px] px-2 py-1.5 max-w-[120px] truncate" title={range.topicName}>
                  {range.topicName}
                </TableCell>
                <TableCell className="text-[11px] px-2 py-1.5 text-right text-muted-foreground">
                  {range.minScore}
                </TableCell>
                <TableCell className="text-[11px] px-2 py-1.5 text-right font-medium">
                  {range.maxScore}
                </TableCell>
                <TableCell className="text-[11px] px-2 py-1.5 text-right text-muted-foreground">
                  {range.uniqueQuestions}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
