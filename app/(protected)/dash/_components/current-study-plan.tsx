"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import React from "react";
import { toast } from "sonner";
import { CaretRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import CurrentPlanMenuButton from "./current-plan-menu-button";
import {
  DashboardData,
  ProblemList,
} from "../../_components/dashboard-provider";

interface CurrentStudyPlanProps {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}

const CurrentStudyPlan = ({
  data,
  loading,
  error,
  onRefresh,
}: CurrentStudyPlanProps) => {
  const [selectedList, setSelectedList] = React.useState<ProblemList | null>(
    null,
  );
  const [selectedPace, setSelectedPace] = React.useState<
    "leisurely" | "normal" | "accelerated"
  >("normal"); // TODO: add custom pace option in the future
  const [submitting, setSubmitting] = React.useState(false);

  // Auto-select the first available list when the list loads
  const problemListsRef = React.useRef(data?.problemLists);
  React.useEffect(() => {
    const lists = data?.problemLists;
    if (lists && lists.length > 0 && !selectedList) {
      setSelectedList(lists[0]);
    }
    problemListsRef.current = lists;
  }, [data?.problemLists, selectedList]);

  // Show greyed out streak icon if streak has not been updated today
  // Else show colored icon
  const streakActiveToday = React.useMemo(() => {
    const lastActivity = data?.streak?.last_activity_date;
    if (!lastActivity) return false;
    const todayStr = new Date().toLocaleDateString("en-CA");
    return lastActivity >= todayStr;
  }, [data?.streak?.last_activity_date]);

  // Estimated first-pass completion date based on unseen problems and daily new quota
  const estCompletionLabel = React.useMemo(() => {
    const plan = data?.studyPlan;
    const s = data?.stats;
    if (!plan || !s || s.notStarted <= 0) return null;
    const daysLeft = Math.ceil(s.notStarted / plan.new_per_day);
    const est = new Date();
    est.setDate(est.getDate() + daysLeft);
    return est.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [data?.studyPlan, data?.stats]);

  const estCompletionFromCreateStudyPlan = React.useMemo(() => {
    if (!selectedList) return null;
    const total = selectedList.problem_count;
    if (total == null) {
      // If problem count is unavailable, do not show an estimated completion date.
      return null;
    }
    const newPerDay =
      selectedPace === "leisurely" ? 1 : selectedPace === "accelerated" ? 3 : 2;
    const daysLeft = Math.ceil(total / newPerDay);
    const est = new Date();
    est.setDate(est.getDate() + daysLeft);
    return est.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedList, selectedPace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedList) {
      toast.error("Please select a problem list");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/user/active-study-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          list_id: selectedList.id,
          pace: selectedPace,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to set active study plan" }));
        throw new Error(errorData.error || "Failed to set active study plan");
      }

      await response.json();
      setSelectedList(problemListsRef.current?.[0] ?? null);
      setSelectedPace("normal");

      // Refresh all dashboard data
      await onRefresh();

      toast.success("Active study plan set successfully!");
    } catch (error) {
      console.error("Error setting active study plan:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to set active study plan",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle>Current Study Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeList = data?.activeList || null;
  const problemLists = data?.problemLists || [];
  const stats = data?.stats || null;
  const streak = data?.streak || null;
  const studyPlan = data?.studyPlan || null;

  if (!activeList) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle>Create a Study Plan</CardTitle>
            <CardDescription>
              You haven't set a study plan yet. Choose a problem list and pace
              to start practicing.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Select Problem List</Label>
                  <Combobox
                    items={problemLists}
                    value={selectedList?.name ?? ""}
                    onValueChange={(value) => {
                      const list = problemLists.find((l) => l.name === value);
                      setSelectedList(list ?? null);
                    }}
                  >
                    <ComboboxInput placeholder="Select a problem list" />
                    <ComboboxContent>
                      <ComboboxEmpty>No problem lists found.</ComboboxEmpty>
                      <ComboboxList>
                        {(item: ProblemList) => (
                          <ComboboxItem key={item.id} value={item.name}>
                            <div className="flex flex-col">
                              <span className="font-medium">{item.name}</span>
                              {item.description && (
                                <span className="text-xs text-muted-foreground">
                                  {item.description}
                                </span>
                              )}
                              {item.source && !item.description && (
                                <span className="text-xs text-muted-foreground">
                                  {item.source}
                                </span>
                              )}
                            </div>
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
                <div className="flex flex-col gap-2">
                  <Label id="pace-group-label">Daily Pace</Label>
                  <div
                    role="radiogroup"
                    aria-labelledby="pace-group-label"
                    className="grid grid-cols-3 gap-2"
                  >
                    {(
                      [
                        {
                          value: "leisurely",
                          label: "Leisurely ⏳",
                          sub: "1 new · 2 review",
                        },
                        {
                          value: "normal",
                          label: "Normal 🚶‍♀️‍➡️",
                          sub: "2 new · 4 review",
                        },
                        {
                          value: "accelerated",
                          label: "Accelerated 🏎️💨",
                          sub: "3 new · 6 review",
                        },
                      ] as const
                    ).map(({ value, label, sub }) => (
                      <label
                        key={value}
                        aria-label={`${label} — ${sub}`}
                        className={`flex flex-col items-center rounded-lg border p-3 text-sm transition-colors cursor-pointer ${
                          selectedPace === value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-muted hover:border-muted-foreground/50 text-muted-foreground"
                        }`}
                      >
                        {/* Native radio: keyboard + screen-reader behaviour for free */}
                        <input
                          type="radio"
                          name="pace"
                          value={value}
                          checked={selectedPace === value}
                          onChange={() => setSelectedPace(value)}
                          className="sr-only"
                        />
                        <span className="font-medium">{label}</span>
                        <span className="text-xs mt-0.5 opacity-70">{sub}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {estCompletionFromCreateStudyPlan && (
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">
                      Estimated first pass
                    </span>
                    <span className="font-semibold text-primary">
                      {estCompletionFromCreateStudyPlan}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <Button
                type="submit"
                disabled={!selectedList || submitting}
                className="w-full"
              >
                {submitting ? "Creating..." : "Create Study Plan"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>{activeList.name}</CardTitle>
          <CardDescription>
            {activeList.description || "Your current active study plan"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="space-y-6">
              {/* Completion Badge and Weekly Goal */}
              <div className="flex items-start justify-between gap-4">
                {/* Completion Percentage Circle */}
                <div className="relative flex items-center justify-center flex-shrink-0">
                  <svg className="w-16 h-16 -rotate-90">
                    {/* Track */}
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      className="text-muted"
                    />
                    {/* In Progress arc (renders first, underneath) */}
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${
                        2 *
                        Math.PI *
                        28 *
                        (1 -
                          Math.min(
                            1,
                            stats.total > 0
                              ? (stats.mastered + stats.inProgress) /
                                  stats.total
                              : 0,
                          ))
                      }`}
                      className="text-blue-500 transition-all duration-500"
                    />
                    {/* Mastered arc (renders on top) */}
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${
                        2 *
                        Math.PI *
                        28 *
                        (1 -
                          Math.min(
                            1,
                            stats.total > 0 ? stats.mastered / stats.total : 0,
                          ))
                      }`}
                      className="text-green-500 transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold leading-none">
                      {stats.total > 0
                        ? Math.round(
                            ((stats.mastered + stats.inProgress) /
                              stats.total) *
                              100,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>

                {/* Streak */}
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">
                    Current Streak
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-bold transition-colors ${
                        streakActiveToday
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {streak?.current_streak ?? 0}
                    </span>
                    <span
                      className={`text-sm transition-colors ${
                        streakActiveToday
                          ? "text-muted-foreground"
                          : "text-muted-foreground/50"
                      }`}
                    >
                      {streak?.current_streak === 1 ? "day" : "days"}{" "}
                      <span
                        className={
                          streakActiveToday ? "" : "grayscale opacity-40"
                        }
                      >
                        🔥
                      </span>
                    </span>
                  </div>
                </div>

                {/* Pace */}
                {studyPlan && (
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">Pace</p>
                    <p className="text-2xl font-bold capitalize">
                      <span className="hidden sm:inline">{studyPlan.pace}</span>
                      <span className="sm:hidden">
                        {studyPlan.pace === "accelerated"
                          ? "Fast"
                          : studyPlan.pace === "leisurely"
                            ? "Slow"
                            : "Normal"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {studyPlan.new_per_day} new · {studyPlan.review_per_day}{" "}
                      review/day
                    </p>
                  </div>
                )}

                {/* Est. completion */}
                {estCompletionLabel && (
                  <div className="hidden md:block min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">
                      Est. First Pass
                    </p>
                    <p className="text-xl font-bold">{estCompletionLabel}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats!.notStarted} problems to introduce
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {stats.mastered + stats.inProgress} / {stats.total}
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                  {/* Mastered segment */}
                  {stats.mastered > 0 && (
                    <div
                      className="bg-green-600 dark:bg-green-400"
                      style={{
                        width: `${(stats.mastered / stats.total) * 100}%`,
                      }}
                      title={`${stats.mastered} mastered`}
                    />
                  )}
                  {/* In Progress segment */}
                  {stats.inProgress > 0 && (
                    <div
                      className="bg-blue-600 dark:bg-blue-400"
                      style={{
                        width: `${(stats.inProgress / stats.total) * 100}%`,
                      }}
                      title={`${stats.inProgress} in progress`}
                    />
                  )}
                  {/* Not Started segment (fills remaining space) */}
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-400" />
                    <span className="text-muted-foreground">
                      Mastered ({stats.mastered})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-blue-600 dark:bg-blue-400" />
                    <span className="text-muted-foreground">
                      In Progress ({stats.inProgress})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-muted-foreground/30" />
                    <span className="text-muted-foreground">
                      New ({stats.notStarted})
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Stats */}
              {stats.dueToday > 0 && (
                <div className="flex items-baseline gap-2 pt-2 border-t">
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.dueToday}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    problems due for review
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-row justify-end gap-2">
          <Button asChild variant="default">
            <Link href="/problems">
              Review Problems <CaretRightIcon />
            </Link>
          </Button>
          <CurrentPlanMenuButton
            problemList={activeList}
            onPlanRemoved={onRefresh}
            currentPace={data?.studyPlan?.pace}
            totalProblems={data?.stats?.total ?? 0}
            completedProblems={
              (data?.stats?.total ?? 0) - (data?.stats?.notStarted ?? 0)
            }
          />
        </CardFooter>
      </Card>
    </div>
  );
};

export default CurrentStudyPlan;
