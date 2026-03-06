"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";

export interface ProblemProgress {
  stage: number;
  next_review_at: string | null;
  last_attempt_at: string | null;
  last_success_at: string | null;
  attempt_count: number;
  success_count: number;
  fail_count: number;
  interval_days: number | null;
  days_overdue: number;
}

export interface Problem {
  id: string;
  key: string;
  title: string;
  category: string;
  difficulty: string;
  leetcode_url?: string;
  order_index?: number;
  progress?: ProblemProgress | null;
}

export interface ProblemList {
  id: string;
  key: string;
  name: string;
  description?: string;
  source?: string;
  version?: string;
}

export interface PlanStats {
  total: number;
  mastered: number;
  dueToday: number;
  inProgress: number;
  notStarted: number;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export interface DashboardData {
  activeList: ProblemList | null;
  problemLists: ProblemList[];
  streak: StreakData | null;
  stats: PlanStats | null;
  dueProblems: Problem[];
  allProblems: Problem[];
}

interface DashboardContextType {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch initial data in parallel
      const [activePlanRes, problemListsRes, streakRes] = await Promise.all([
        fetch('/api/user/active-study-plan'),
        fetch('/api/problemlists'),
        fetch('/api/user/streak'),
      ]);

      // Check for auth errors
      if (activePlanRes.status === 401 || problemListsRes.status === 401 || streakRes.status === 401) {
        // Clear any previously loaded protected data before redirecting
        setData(null);
        setError(null);
        router.replace('/auth/login');
        return;
      }

      // Check for API failures
      if (!activePlanRes.ok) {
        throw new Error('Failed to fetch active study plan');
      }

      if (!problemListsRes.ok) {
        throw new Error('Failed to fetch problem lists');
      }

      // Streak is optional - don't fail if it's unavailable
      const activePlanData = await activePlanRes.json();
      const problemListsData = await problemListsRes.json();
      const streakData = streakRes.ok ? await streakRes.json() : null;

      // Fetch dependent data if there's an active list
      let stats = null;
      let dueProblems: Problem[] = [];
      let allProblems: Problem[] = [];

      if (activePlanData.active_list?.key) {
        const encodedKey = encodeURIComponent(activePlanData.active_list.key);
        const [statsRes, dueRes, progressRes] = await Promise.all([
          fetch(`/api/problemlists/${encodedKey}/stats`),
          fetch(`/api/problemlists/${encodedKey}/due`),
          fetch(`/api/problemlists/${encodedKey}/progress`),
        ]);

        if (!statsRes.ok) {
          throw new Error('Failed to fetch study plan statistics');
        }

        if (!dueRes.ok) {
          throw new Error('Failed to fetch due problems');
        }

        if (!progressRes.ok) {
          throw new Error('Failed to fetch problem list');
        }

        stats = await statsRes.json();
        const dueData = await dueRes.json();
        const progressData = await progressRes.json();
        dueProblems = dueData?.due_problems || [];
        allProblems = Array.isArray(progressData?.problems) ? progressData.problems : [];
      }

      setData({
        activeList: activePlanData.active_list,
        problemLists: Array.isArray(problemListsData?.data) ? problemListsData.data : [],
        streak: streakData,
        stats,
        dueProblems,
        allProblems,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const value = {
    data,
    loading,
    error,
    refreshData: fetchDashboardData,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
