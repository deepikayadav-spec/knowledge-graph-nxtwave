// Class analytics panel showing cohort-level insights

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  AlertTriangle, 
  TrendingDown,
  BarChart3,
  UserX
} from 'lucide-react';
import type { ClassAnalytics, StudentMasterySummary } from '@/types/mastery';

interface ClassAnalyticsPanelProps {
  analytics: ClassAnalytics | null;
  studentSummaries: StudentMasterySummary[];
  skillNames?: Record<string, string>;
  loading?: boolean;
}

export function ClassAnalyticsPanel({
  analytics,
  studentSummaries,
  skillNames = {},
  loading = false,
}: ClassAnalyticsPanelProps) {
  const overallClassMastery = useMemo(() => {
    if (studentSummaries.length === 0) return 0;
    return studentSummaries.reduce((sum, s) => sum + s.overallMastery, 0) / studentSummaries.length;
  }, [studentSummaries]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <div className="animate-pulse">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics || studentSummaries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No analytics data available</p>
          <p className="text-sm mt-1">Add students and record attempts to see insights</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Class Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="h-4 w-4" />
              Students
            </div>
            <div className="text-2xl font-bold">
              {analytics.totalStudents}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart3 className="h-4 w-4" />
              Class Average
            </div>
            <div className="text-2xl font-bold text-primary">
              {Math.round(overallClassMastery * 100)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <UserX className="h-4 w-4" />
              At Risk
            </div>
            <div className="text-2xl font-bold text-destructive">
              {analytics.atRiskStudents.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingDown className="h-4 w-4" />
              Weak Spots
            </div>
            <div className="text-2xl font-bold text-accent-foreground">
              {analytics.weakSpots.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Students */}
      {analytics.atRiskStudents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              At-Risk Students (Below 50%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.atRiskStudents.map(student => (
                <div 
                  key={student.studentId}
                  className="flex items-center justify-between p-2 rounded-lg bg-destructive/5"
                >
                  <span className="font-medium">{student.studentName}</span>
                  <Badge variant="destructive">
                    {Math.round(student.averageMastery * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weak Spots */}
      {analytics.weakSpots.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Common Weak Spots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.weakSpots.slice(0, 5).map(spot => {
                const skillName = skillNames[spot.skillId] || spot.skillId;
                
                return (
                  <div key={spot.skillId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{skillName}</span>
                      <span className="text-sm text-muted-foreground">
                        {spot.studentsBelow50} students below 50%
                      </span>
                    </div>
                    <Progress 
                      value={spot.averageMastery * 100} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground">
                      Class average: {Math.round(spot.averageMastery * 100)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Rankings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Student Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {studentSummaries
              .sort((a, b) => b.overallMastery - a.overallMastery)
              .map((student, index) => (
                <div 
                  key={student.studentId}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <span className="font-medium">{student.studentName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={student.overallMastery * 100} 
                      className="w-20 h-2"
                    />
                    <span className="text-sm font-bold w-12 text-right">
                      {Math.round(student.overallMastery * 100)}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
