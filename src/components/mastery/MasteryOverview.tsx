// Mastery overview dashboard for a single student

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { RETENTION_THRESHOLDS, MASTERY_THRESHOLDS } from '@/lib/mastery/constants';
import type { KPMastery, StudentMasterySummary } from '@/types/mastery';

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
  const summary = useMemo((): StudentMasterySummary => {
    const records = masteryRecords;
    const overallMastery = records.length > 0
      ? records.reduce((sum, m) => sum + (m.effectiveMastery ?? m.rawMastery), 0) / records.length
      : 0;

    return {
      studentId,
      studentName,
      overallMastery,
      masteredKPs: records.filter(m => (m.effectiveMastery ?? 0) >= MASTERY_THRESHOLDS.mastered).length,
      agingKPs: records.filter(m => m.retentionStatus === 'aging').length,
      expiredKPs: records.filter(m => m.retentionStatus === 'expired').length,
      totalKPs: records.length,
    };
  }, [masteryRecords, studentId, studentName]);

  const sortedRecords = useMemo(() => {
    return [...masteryRecords].sort((a, b) => {
      // Sort by retention status (expired first, then aging, then current)
      const statusOrder = { expired: 0, aging: 1, current: 2, undefined: 3 };
      const statusDiff = (statusOrder[a.retentionStatus ?? 'undefined'] ?? 3) - (statusOrder[b.retentionStatus ?? 'undefined'] ?? 3);
      if (statusDiff !== 0) return statusDiff;
      // Then by effective mastery (lowest first)
      return (a.effectiveMastery ?? a.rawMastery) - (b.effectiveMastery ?? b.rawMastery);
    });
  }, [masteryRecords]);

  const getMasteryColor = (mastery: number) => {
    if (mastery >= MASTERY_THRESHOLDS.mastered) return 'text-primary';
    if (mastery >= MASTERY_THRESHOLDS.proficient) return 'text-accent-foreground';
    if (mastery >= MASTERY_THRESHOLDS.developing) return 'text-muted-foreground';
    return 'text-destructive';
  };

  const getRetentionBadge = (status?: string) => {
    switch (status) {
      case 'current':
        return <Badge variant="outline" className="text-primary border-primary">Current</Badge>;
      case 'aging':
        return <Badge variant="outline" className="text-accent-foreground border-accent">Aging</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (masteryRecords.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No mastery data yet for {studentName}</p>
          <p className="text-sm mt-1">Record some attempts to see progress</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Summary Cards - Always visible */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-shrink-0">
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

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
              <Clock className="h-3.5 w-3.5" />
              Aging
            </div>
            <div className="text-xl font-bold text-accent-foreground">
              {summary.agingKPs}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Expired
            </div>
            <div className="text-xl font-bold text-destructive">
              {summary.expiredKPs}
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
                const effectiveMastery = record.effectiveMastery ?? record.rawMastery;
                const skillName = skillNames[record.skillId] || record.skillId;
                
                return (
                  <div key={record.skillId} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate mr-2">{skillName}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-xs font-bold ${getMasteryColor(effectiveMastery)}`}>
                          {Math.round(effectiveMastery * 100)}%
                        </span>
                        {getRetentionBadge(record.retentionStatus)}
                      </div>
                    </div>
                    <Progress 
                      value={effectiveMastery * 100} 
                      className="h-1.5"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>
                        Raw: {Math.round(record.rawMastery * 100)}% | Ret: {Math.round((record.retentionFactor ?? 1) * 100)}%
                      </span>
                      <span>{record.retrievalCount} recalls</span>
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
