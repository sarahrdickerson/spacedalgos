"use client";

import CurrentStudyPlan from "./_components/current-study-plan";
import DueQuestions from "./_components/due-questions";
import { CalendarProblems } from "@/components/calendar-problems";
import { useDashboard } from "../_components/dashboard-provider";

export default function DashPage() {
  const { data, loading, error, refreshData } = useDashboard();

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="flex flex-col gap-2 items-start md:col-span-2">
          <CurrentStudyPlan
            data={data}
            loading={loading}
            error={error}
            onRefresh={refreshData}
          />
        </div>
        <div className="flex flex-col gap-2 items-start">
          <DueQuestions
            data={data}
            loading={loading}
            onRefresh={refreshData}
          />
        </div>
      </div>
      <CalendarProblems
        data={data}
        loading={loading}
      />
    </div>
  );
}
