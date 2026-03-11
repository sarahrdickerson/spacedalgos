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
import { ChangePaceDialog } from "../../dash/_components/change-pace-dialog";
import { useDashboard } from "../../_components/dashboard-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { PACE_OPTIONS } from "@/lib/pace-options";

export function StudyPlanCard() {
  const { data, loading, error } = useDashboard();
  const [isChangePaceOpen, setIsChangePaceOpen] = React.useState(false);

  const plan = data?.studyPlan ?? null;
  const listId = data?.activeList?.id ?? null;
  const totalProblems = data?.stats?.total ?? 0;
  const completedProblems = totalProblems - (data?.stats?.notStarted ?? 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Study Plan</CardTitle>
          <CardDescription>Your active study pace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row">
            <Skeleton className="w-48 h-6 mr-4" />
            <Skeleton className="w-16 h-6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Study Plan</CardTitle>
          <CardDescription>Your active study pace.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Failed to load study plan. Please refresh the page.
          </p>
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
                {PACE_OPTIONS.find((p) => p.key === plan.pace)?.label ??
                  plan.pace}
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
      />
    </>
  );
}
