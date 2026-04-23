"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
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
  days_overdue?: number;
  days_until?: number;
}

export interface Problem {
  id: string;
  key: string;
  title: string;
  category: string;
  difficulty: string;
  leetcode_url: string;
  is_premium: boolean;
  order_index?: number;
  is_new?: boolean;
  projected_date?: string | null; // ISO date string for upcoming projected new problems
  progress?: ProblemProgress | null;
}

export interface StudyPlan {
  pace: string;
  new_per_day: number;
  review_per_day: number;
  start_date: string | null;
  target_end_date: string | null;
}

export interface ProblemList {
  id: string;
  key: string;
  name: string;
  problem_count?: number;
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
  recent_activity?: Array<{
    activity_date: string;
    problems_reviewed: number;
    problems_due_completed: number;
  }>;
}

export interface DashboardData {
  activeList: ProblemList | null;
  problemLists: ProblemList[];
  streak: StreakData | null;
  stats: PlanStats | null;
  dueProblems: Problem[];
  allProblems: Problem[];
  studyPlan: StudyPlan | null;
}

interface DashboardContextType {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined,
);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return context;
}

// --- localStorage cache helpers ---

const CACHE_KEY = "dashboard-cache-v1";

interface CachedDashboard {
  data: DashboardData;
  localDate: string; // YYYY-MM-DD — invalidated when the calendar day changes
}

function loadCache(): DashboardData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedDashboard = JSON.parse(raw);
    const today = new Date().toLocaleDateString("en-CA");
    if (cached.localDate !== today) return null; // new day — stale
    return cached.data;
  } catch {
    return null;
  }
}

function saveCache(data: DashboardData): void {
  try {
    const today = new Date().toLocaleDateString("en-CA");
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, localDate: today }));
  } catch {
    // ignore quota / SSR errors
  }
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent the mount effect from running twice in React Strict Mode
  const hasMounted = useRef(false);

  const fetchDashboardData = useCallback(
    async (showLoadingSpinner: boolean) => {
      try {
        setError(null);
        if (showLoadingSpinner) setLoading(true);

        const localDate = new Date().toLocaleDateString("en-CA");
        const tzOffset = new Date().getTimezoneOffset();
        const res = await fetch(
          `/api/dashboard-data?localDate=${localDate}&tzOffset=${tzOffset}`,
        );

        if (res.status === 401) {
          setData(null);
          setError(null);
          router.replace("/auth/continue");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const json = await res.json();
        const newData: DashboardData = {
          activeList: json.active_list,
          problemLists: Array.isArray(json.problem_lists)
            ? json.problem_lists
            : [],
          streak: json.streak ?? null,
          stats: json.stats ?? null,
          dueProblems: Array.isArray(json.due_problems) ? json.due_problems : [],
          allProblems: Array.isArray(json.all_problems) ? json.all_problems : [],
          studyPlan: json.study_plan ?? null,
        };

        setData(newData);
        saveCache(newData);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (showLoadingSpinner) setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    const cached = loadCache();
    if (cached) {
      // Show stale data immediately — no spinner
      setData(cached);
      setLoading(false);
      // Refresh silently in the background
      fetchDashboardData(false);
    } else {
      fetchDashboardData(true);
    }
  }, [fetchDashboardData]);

  // Manual refresh (e.g. after logging an attempt) always shows a spinner
  // and saves the result back to cache
  const refreshData = useCallback(
    () => fetchDashboardData(true),
    [fetchDashboardData],
  );

  const value = {
    data,
    loading,
    error,
    refreshData,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
