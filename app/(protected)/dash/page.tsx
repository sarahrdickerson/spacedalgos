import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import CurrentStudyPlan from "./_components/current-study-plan";
import DueQuestions from "./_components/due-questions";
import { CalendarProblems } from "@/components/calendar-problems";

async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return JSON.stringify(data.claims, null, 2);
}

export default function DashPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="flex flex-col gap-2 items-start md:col-span-2">
          <CurrentStudyPlan />
        </div>
        <div className="flex flex-col gap-2 items-start">
          <DueQuestions />
        </div>
      </div>
        <CalendarProblems />
    </div>
  );
}
