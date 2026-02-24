// Mastery overview dashboard for a single student

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  CheckCircle2,
} from 'lucide-react';
import { MASTERY_THRESHOLDS } from '@/lib/mastery/constants';
import type { KPMastery } from '@/types/mastery';

interface MasteryOverviewProps {
  studentId: string;
  studentName: string;
  masteryRecords: KPMastery[];
  skillNames?: Record<string, string>;
}

export function MasteryOverview({
  studentId,
  studentName,
  masteryRecords,
  skillNames = {},
}: MasteryOverviewProps) {
  const summary = useMemo(() => {
    const records = masteryRecords;
    const overallMastery = records.length > 0
      ? records.reduce((sum, m) => sum + m.rawMastery, 0) / records.length
      : 0;

    return {
      overallMastery,
      masteredKPs: records.filter(m => m.rawMastery >= MASTERY_THRESHOLDS.mastered).length,
      totalKPs: records.length,
    };
  }, [masteryRecords]);

  const sortedRecords = useMemo(() => {
    return [...masteryRecords].sort((a, b) => a.rawMastery - b.rawMastery);
  }, [masteryRecords]);

  const getMasteryColor = (mastery: number) => {
    if (mastery >= MASTERY_THRESHOLDS.mastered) return 'text-primary';
    if (mastery >= MASTERY_THRESHOLDS.proficient) return 'text-accent-foreground';
    if (mastery >= MASTERY_THRESHOLDS.developing) return 'text-muted-foreground';
    return 'text-destructive';
  };

  if (masteryRecords.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No mastery data yet for {studentName}</p>
          <p className="text-sm mt-1">Upload attempt data to see progress</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 flex-shrink-0">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Overall
            </div>
            <div className={`text-xl font-bold ${getMasteryColor(summary.overallMastery)}`}>
              {Math.round(summary.overallMastery * 100)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mastered
            </div>
            <div className="text-xl font-bold text-primary">
              {summary.masteredKPs}/{summary.totalKPs}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scrollable KP List */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Knowledge Points ({masteryRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0">
          <ScrollArea className="h-[calc(100vh-380px)] px-4 pb-4">
            <div className="space-y-2">
              {sortedRecords.map(record => {
                const mastery = record.rawMastery;
                const skillName = skillNames[record.skillId] || record.skillId;
                
                return (
                  <div key={record.skillId} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate mr-2">{skillName}</span>
                      <span className={`text-xs font-bold ${getMasteryColor(mastery)}`}>
                        {Math.round(mastery * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={mastery * 100} 
                      className="h-1.5"
                    />
                    <div className="text-[10px] text-muted-foreground">
                      {record.earnedPoints}/{record.maxPoints} questions correct
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
