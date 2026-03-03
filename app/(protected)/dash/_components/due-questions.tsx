"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogAttemptDialog } from "@/components/log-attempt-dialog";
import { DueQuestionCard } from "./due-question-card";
import React from "react";

interface Problem {
  id: string;
  key: string;
  title: string;
  category: string;
  difficulty: string;
  progress?: {
    stage: number;
    next_review_at: string;
  };
}

const DueQuestions = () => {
  const [stats, setStats] = React.useState<{
    dueToday: number;
    dueThisWeek: number;
    currentStreak: number;
  } | null>(null);
  const [dueTodayProblems, setDueTodayProblems] = React.useState<Problem[]>([]);
  const [dueThisWeekProblems, setDueThisWeekProblems] = React.useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = React.useState<Problem | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch active study plan first
        const activeResponse = await fetch("/api/user/active-study-plan");
        if (!activeResponse.ok) {
          setLoading(false);
          return;
        }
        const activeData = await activeResponse.json();

        if (!activeData.active_list?.key) {
          setLoading(false);
          return;
        }

        // Fetch due problems for the active plan
        const dueResponse = await fetch(
          `/api/problemlists/${activeData.active_list.key}/due`,
        );
        if (!dueResponse.ok) {
          setLoading(false);
          return;
        }

        const dueData = await dueResponse.json();
        const problems = dueData.due_problems || [];

        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        // Filter problems due today
        const todayProblems = problems.filter((p: any) => {
          const nextReview = p.progress?.next_review_at;
          if (!nextReview) return false;
          const reviewDate = new Date(nextReview);
          return reviewDate <= now;
        });

        // Filter problems due this week
        const thisWeekProblems = problems.filter((p: any) => {
          const nextReview = p.progress?.next_review_at;
          if (!nextReview) return false;
          const reviewDate = new Date(nextReview);
          return reviewDate > today && reviewDate <= weekFromNow;
        });

        // Calculate current streak (days reviewed consecutively)
        // For now, we'll use a placeholder - you'd need to track review history
        const currentStreak = 0; // TODO: Implement streak tracking

        setStats({
          dueToday: todayProblems.length,
          dueThisWeek: thisWeekProblems.length,
          currentStreak,
        });
        setDueTodayProblems(todayProblems);
        setDueThisWeekProblems(thisWeekProblems);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching due questions stats:", error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleSuccess = async () => {
    // Refetch stats after successful attempt
    try {
      const activeResponse = await fetch("/api/user/active-study-plan");
      if (!activeResponse.ok) return;
      const activeData = await activeResponse.json();
      if (!activeData.active_list?.key) return;

      const dueResponse = await fetch(
        `/api/problemlists/${activeData.active_list.key}/due`,
      );
      if (!dueResponse.ok) return;

      const dueData = await dueResponse.json();
      const problems = dueData.due_problems || [];

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      const todayProblems = problems.filter((p: any) => {
        const nextReview = p.progress?.next_review_at;
        if (!nextReview) return false;
        const reviewDate = new Date(nextReview);
        return reviewDate <= now;
      });

      const dueThisWeekProblems = problems.filter((p: any) => {
        const nextReview = p.progress?.next_review_at;
        if (!nextReview) return false;
        const reviewDate = new Date(nextReview);
        return reviewDate > today && reviewDate <= weekFromNow;
      });
      const dueThisWeek = dueThisWeekProblems.length;

      const currentStreak = 0;

      setStats({ dueToday: todayProblems.length, dueThisWeek, currentStreak });
      setDueTodayProblems(todayProblems);
      setDueThisWeekProblems(dueThisWeekProblems);
    } catch (error) {
      console.error("Error refetching stats:", error);
    }
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
