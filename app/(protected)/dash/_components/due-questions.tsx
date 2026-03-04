"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogAttemptDialog } from "@/components/log-attempt-dialog";
import { DueQuestionCard } from "./due-question-card";
import React from "react";
import { DashboardData, Problem } from "../../_components/dashboard-provider";

interface DueQuestionsProps {
  data: DashboardData | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

const DueQuestions = ({ data, loading, onRefresh }: DueQuestionsProps) => {
  const [selectedProblem, setSelectedProblem] = React.useState<Problem | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState<Date | null>(null);

  // Set current time on client side only, and update when data refreshes
  React.useEffect(() => {
    setCurrentTime(new Date());
  }, []);

  // Update currentTime when dashboard data is refreshed
  React.useEffect(() => {
    if (!loading && data?.dueProblems) {
      setCurrentTime(new Date());
    }
  }, [loading, data?.dueProblems]);

  const { dueTodayProblems, dueThisWeekProblems, stats } = React.useMemo(() => {
    // If no active list, return null stats to trigger empty state
    if (!data?.activeList || !currentTime) {
      return {
        dueTodayProblems: [],
        dueThisWeekProblems: [],
        stats: null
      };
    }

    const dueProblems = data.dueProblems || [];
    const now = currentTime;
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Filter problems due today
    const todayProblems = dueProblems.filter((p: Problem) => {
      const nextReview = p.progress?.next_review_at;
      if (!nextReview) return false;
      const reviewDate = new Date(nextReview);
      return reviewDate <= now;
    });

    // Filter problems due this week
    const weekProblems = dueProblems.filter((p: Problem) => {
      const nextReview = p.progress?.next_review_at;
      if (!nextReview) return false;
      const reviewDate = new Date(nextReview);
      return reviewDate > today && reviewDate <= weekFromNow;
    });

    const currentStreak = data?.streak?.current_streak || 0;
    
    return {
      dueTodayProblems: todayProblems,
      dueThisWeekProblems: weekProblems,
      stats: {
        dueToday: todayProblems.length,
        dueThisWeek: weekProblems.length,
        currentStreak,
      }
    };
  }, [data?.dueProblems, data?.streak, data?.activeList, currentTime]);

  const handleSuccess = async () => {
    // Refresh all dashboard data
    await onRefresh();
  };

  if (loading) {
    return (
      <div className="flex w-full flex-col">
        <h2 className="font-bold text-xl mb-4">Review Status</h2>
        <Card>
          <CardContent>
            <div className="flex flex-row gap-4 items-center">
              <Skeleton className="h-12 w-24" />
              <Separator orientation="vertical" className="h-12" />
              <Skeleton className="h-12 w-24" />
              <Separator orientation="vertical" className="h-12" />
              <Skeleton className="h-12 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex w-full flex-col">
        <h2 className="font-bold text-xl mb-4">Review Status</h2>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              Set an active study plan to see your review status.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <h2 className="font-bold text-xl mb-4">Review Status</h2>
      {stats && (
        <Tabs defaultValue="today" className="w-full flex flex-col">
          <TabsList variant="line" className="w-full">
            <TabsTrigger value="today" className="flex-1">
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.dueToday}
              </span>{" "}
              due today
            </TabsTrigger>
            <TabsTrigger value="week" className="flex-1">
              <span className="text-2xl font-bold">{stats.dueThisWeek}</span>{" "}
              this week
            </TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="mt-4">
            <DueQuestionCard
              problems={dueTodayProblems}
              onProblemClick={(problem) => {
                setSelectedProblem(problem);
                setDialogOpen(true);
              }}
              emptyMessage="✓ All caught up! No reviews due today."
            />
          </TabsContent>
          <TabsContent value="week" className="mt-4">
            <DueQuestionCard
              problems={dueThisWeekProblems}
              onProblemClick={(problem) => {
                setSelectedProblem(problem);
                setDialogOpen(true);
              }}
              emptyMessage="No problems due this week."
            />
          </TabsContent>
        </Tabs>
      )}

      {selectedProblem && (
        <LogAttemptDialog
          problemKey={selectedProblem.key}
          problemTitle={selectedProblem.title}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default DueQuestions;
