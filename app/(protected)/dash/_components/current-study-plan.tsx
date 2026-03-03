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
import { CaretRightIcon, DotsVerticalIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import CurrentPlanMenuButton from "./current-plan-menu-button";

interface ProblemList {
  id: string;
  key: string;
  name: string;
  description?: string;
  source?: string;
  version?: string;
}

interface PlanStats {
  total: number;
  mastered: number;
  dueToday: number;
  inProgress: number;
  notStarted: number;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

const CurrentStudyPlan = () => {
  const [activeList, setActiveList] = React.useState<ProblemList | null>(null);
  const [problemLists, setProblemLists] = React.useState<ProblemList[]>([]);
  const [selectedList, setSelectedList] = React.useState<ProblemList | null>(null);
  const [stats, setStats] = React.useState<PlanStats | null>(null);
  const [streak, setStreak] = React.useState<StreakData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [listsLoading, setListsLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      // Fetch active study plan
      const activeResponse = await fetch("/api/user/active-study-plan");
      if (!activeResponse.ok) {
        throw new Error("Failed to fetch active study plan");
      }
      const activeData = await activeResponse.json();
      setActiveList(activeData.active_list);

      // Fetch stats if there's an active list
      if (activeData.active_list?.key) {
        const statsResponse = await fetch(
          `/api/problemlists/${activeData.active_list.key}/stats`
        );
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      }

      // Fetch streak data
      const streakResponse = await fetch("/api/user/streak");
      if (streakResponse.ok) {
        const streakData = await streakResponse.json();
        setStreak(streakData);
      }

      // Fetch problem lists
      setListsLoading(true);
      const listsResponse = await fetch("/api/problemlists");
      if (!listsResponse.ok) {
        throw new Error("Failed to fetch problem lists");
      }
      const listsData = await listsResponse.json();
      setProblemLists(Array.isArray(listsData?.data) ? listsData.data : []);
      setListsLoading(false);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setError("Failed to load study plan data");
      setLoading(false);
      setListsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to set active study plan" }));
        throw new Error(errorData.error || "Failed to set active study plan");
      }

      const data = await response.json();
      setActiveList(data.active_list);
      setSelectedList(null);
      
      // Fetch stats for the new active list
      if (data.active_list?.key) {
        const statsResponse = await fetch(
          `/api/problemlists/${data.active_list.key}/stats`
        );
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      }
      
      toast.success("Active study plan set successfully!");
    } catch (error) {
      console.error("Error setting active study plan:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to set active study plan"
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

  if (!activeList) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle>Current Study Plan</CardTitle>
            <CardDescription>
              You haven't set an active study plan yet. Choose a problem list to
              start practicing.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className="flex flex-row gap-4 items-end w-full justify-between">
                <div className="flex flex-col gap-2 w-full">
                  <Label>Select Problem List</Label>
                  {listsLoading ? (
                    <div className="flex items-center gap-2 p-2">
                      <Spinner className="w-4 h-4" />
                      <span className="text-sm text-muted-foreground">
                        Loading problem lists...
                      </span>
                    </div>
                  ) : (
                    <Combobox
                      items={problemLists}
                      value={selectedList?.name ?? ""}
                      onValueChange={(value) => {
                        const list = problemLists.find(l => l.name === value);
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
                  )}
                </div>
                <Button type="submit" disabled={!selectedList || submitting}>
                {submitting ? "Setting..." : "Set Active Study Plan"}
              </Button>
              </div>
            </CardContent>
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
            <div className="space-y-4">
              {/* Completion Badge and Weekly Goal */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Completion Percentage Circle */}
                  <div className="relative flex items-center justify-center">
                    <svg className="w-16 h-16 -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${
                          2 * Math.PI * 28 * (stats.total > 0 ? 1 - stats.mastered / stats.total : 1)
                        }`}
                        className="text-green-600 dark:text-green-400 transition-all duration-500"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold">
                        {stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Streak */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current Streak</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {streak?.current_streak ?? 0}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {streak?.current_streak === 1 ? "day" : "days"} 🔥
                      </span>
                    </div>
                  </div>
                </div>
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
            <Link href="/problemsets">
              Review Problems <CaretRightIcon />
            </Link>
          </Button>
          <CurrentPlanMenuButton 
            problemList={activeList}
            onPlanRemoved={fetchData}
          />
          
        </CardFooter>
      </Card>
    </div>
  );
};

export default CurrentStudyPlan;
