"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangePaceDialog } from "../../dash/_components/change-pace-dialog";

const PACE_LABELS: Record<string, string> = {
  leisurely: "Leisurely",
  normal: "Normal",
  accelerated: "Accelerated",
};

export function StudyPlanCard() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isChangePaceOpen, setIsChangePaceOpen] = React.useState(false);
  const [plan, setPlan] = React.useState<{
    pace: string;
    new_per_day: number;
    review_per_day: number;
  } | null>(null);
  const [listId, setListId] = React.useState<string | null>(null);
  const [totalProblems, setTotalProblems] = React.useState(0);
  const [completedProblems, setCompletedProblems] = React.useState(0);

  const resetPlanState = React.useCallback(() => {
    setPlan(null);
    setListId(null);
    setTotalProblems(0);
    setCompletedProblems(0);
  }, []);

  const fetchPlanData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/active-study-plan");
      if (!res.ok) {
        resetPlanState();
        return;
      }
      const data = await res.json();
      if (!data.study_plan || !data.active_list) {
        resetPlanState();
        return;
      }

      setPlan(data.study_plan);
      setListId(data.active_list.id);

      const encodedKey = encodeURIComponent(data.active_list.key);
      const statsRes = await fetch(`/api/problemlists/${encodedKey}/stats`);
      if (!statsRes.ok) {
        resetPlanState();
        return;
      }
      const stats = await statsRes.json();
      setTotalProblems(stats.total ?? 0);
      setCompletedProblems((stats.total ?? 0) - (stats.notStarted ?? 0));
    } catch {
      // silently fail — settings page should still render
      resetPlanState();
    } finally {
      setIsLoading(false);
    }
  }, [resetPlanState]);

  React.useEffect(() => {
    fetchPlanData();
  }, [fetchPlanData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Study Plan</CardTitle>
          <CardDescription>Your active study pace.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plan || !listId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Study Plan</CardTitle>
          <CardDescription>Your active study pace.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No active study plan. Set one up from the dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Study Plan</CardTitle>
          <CardDescription>Your active study pace.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {PACE_LABELS[plan.pace] ?? plan.pace}
              </p>
              <p className="text-sm text-muted-foreground">
                {plan.new_per_day} new/day · {plan.review_per_day} reviews/day
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChangePaceOpen(true)}
            >
              Change Pace
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangePaceDialog
        open={isChangePaceOpen}
        onOpenChange={setIsChangePaceOpen}
        currentPace={plan.pace}
        listId={listId}
        totalProblems={totalProblems}
        completedProblems={completedProblems}
        onSuccess={fetchPlanData}
      />
    </>
  );
}
