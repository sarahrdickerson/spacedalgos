"use client";

import CurrentStudyPlan from "./_components/current-study-plan";
import DueQuestions from "./_components/due-questions";
import { CalendarProblems } from "@/components/calendar-problems";
import React from "react";
import { useRouter } from "next/navigation";

export default function DashPage() {
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  const fetchDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [activePlanRes, problemListsRes, streakRes] = await Promise.all([
        fetch("/api/user/active-study-plan"),
        fetch("/api/problemlists"),
        fetch("/api/user/streak"),
      ]);

      // Check for authentication error
      if (activePlanRes.status === 401) {
        router.replace("/auth/login");
        return;
      }

      if (!activePlanRes.ok) {
        throw new Error("Failed to fetch active study plan");
      }

      const activePlanData = await activePlanRes.json();
      const problemListsData = problemListsRes.ok
        ? await problemListsRes.json()
        : { data: [] };
      const streakData = streakRes.ok ? await streakRes.json() : null;

      // If there's an active list, fetch stats and due problems
      let statsData = null;
      let dueProblems = null;

      if (activePlanData.active_list?.key) {
        const encodedKey = encodeURIComponent(activePlanData.active_list.key);
        const [statsRes, dueRes] = await Promise.all([
          fetch(`/api/problemlists/${encodedKey}/stats`),
          fetch(`/api/problemlists/${encodedKey}/due`),
        ]);

        statsData = statsRes.ok ? await statsRes.json() : null;
        dueProblems = dueRes.ok ? await dueRes.json() : null;
      }

      setDashboardData({
        activeList: activePlanData.active_list,
        problemLists: Array.isArray(problemListsData?.data)
          ? problemListsData.data
          : [],
        stats: statsData,
        streak: streakData,
        dueProblems: dueProblems?.due_problems || [],
      });
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="flex flex-col gap-2 items-start md:col-span-2">
          <CurrentStudyPlan
            data={dashboardData}
            loading={loading}
            error={error}
            onRefresh={fetchDashboardData}
          />
        </div>
        <div className="flex flex-col gap-2 items-start">
          <DueQuestions
            data={dashboardData}
            loading={loading}
            onRefresh={fetchDashboardData}
          />
        </div>
      </div>
      <CalendarProblems
        data={dashboardData}
        loading={loading}
      />
    </div>
  );
}
