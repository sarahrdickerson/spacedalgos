'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardData {
  activeList: any;
  problemLists: any[];
  streak: any;
  stats: any;
  dueProblems: any[];
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
        router.replace('/auth/login');
        return;
      }

      if (!activePlanRes.ok) {
        throw new Error('Failed to fetch active study plan');
      }

      const activePlanData = await activePlanRes.json();
      const problemListsData = problemListsRes.ok ? await problemListsRes.json() : { data: [] };
      const streakData = streakRes.ok ? await streakRes.json() : null;

      // Fetch dependent data if there's an active list
      let stats = null;
      let dueProblems = [];

      if (activePlanData.active_list?.key) {
        const encodedKey = encodeURIComponent(activePlanData.active_list.key);
        const [statsRes, dueRes] = await Promise.all([
          fetch(`/api/problemlists/${encodedKey}/stats`),
          fetch(`/api/problemlists/${encodedKey}/due`),
        ]);

        stats = statsRes.ok ? await statsRes.json() : null;
        const dueData = dueRes.ok ? await dueRes.json() : null;
        dueProblems = dueData?.due_problems || [];
      }

      setData({
        activeList: activePlanData.active_list,
        problemLists: Array.isArray(problemListsData?.data) ? problemListsData.data : [],
        streak: streakData,
        stats,
        dueProblems,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Fetch data on mount
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
