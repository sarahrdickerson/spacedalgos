"use client"

import React from "react"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { LogAttemptDialog } from "@/components/log-attempt-dialog"
import { DashboardData, Problem } from "@/app/(protected)/_components/dashboard-provider"

interface CalendarEvent {
  id: string
  title: string
  problemKey: string
  date: Date
  stage: number
  daysOverdue: number
  attemptCount: number
  difficulty: "Easy" | "Medium" | "Hard"
}

interface CalendarProblemsProps {
  data: DashboardData | null;
  loading: boolean;
  error?: unknown;
}

export function CalendarProblems({ data, loading, error }: CalendarProblemsProps) {
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  // Handle error and missing-data states so the calendar does not silently render empty
  if (error) {
    // Normalize to an Error instance so React error boundaries can handle it
    if (error instanceof Error) {
      throw error
    }
    throw new Error(typeof error === "string" ? error : "An unknown error occurred while loading the dashboard")
  }

  if (!loading && !data) {
    throw new Error("Failed to load dashboard data for the calendar")
  }
  // Convert due problems to calendar events
  const events: CalendarEvent[] = (data?.dueProblems || [])
    .filter((problem): problem is Problem & { progress: Required<Problem>['progress'] } => 
      problem.progress !== undefined
    )
    .map((problem) => ({
      id: problem.id,
      title: problem.title,
      problemKey: problem.key,
      date: new Date(problem.progress.next_review_at),
      stage: problem.progress.stage,
      daysOverdue: problem.progress.days_overdue,
      attemptCount: problem.progress.attempt_count,
      difficulty: problem.difficulty as "Easy" | "Medium" | "Hard",
    })
  );

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(
      (event) => event.date.toDateString() === date.toDateString()
    )
  }

  const renderDay = (date: Date) => {
    const dayEvents = getEventsForDate(date)

    return (
      <div className="flex flex-col gap-1">
        {dayEvents.map((event) => {
          // Color by stage: 1 = Learning (yellow), 2 = Reinforcing (blue), 3 = Mastered (green)
          const stageColor =
            event.stage === 1
              ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20"
              : event.stage === 2
                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20"
                : "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"

          // If overdue, add red tint
          const overdueStyle = event.daysOverdue > 0
            ? "ring-1 ring-red-500/50"
            : ""

          return (
            <button
              key={event.id}
              type="button"
              className={cn(
                "text-xs px-2 py-1 rounded transition-colors text-left w-full",
                stageColor,
                overdueStyle
              )}
              title={`${event.title} - Stage ${event.stage}, Attempt #${event.attemptCount + 1}${event.daysOverdue > 0 ? ` (${event.daysOverdue}d overdue)` : ""}`}
              onClick={() => {
                setSelectedEvent(event)
                setDialogOpen(true)
              }}
            >
              {event.title} <span className="text-muted-foreground">#{event.attemptCount + 1}</span>
              {event.daysOverdue > 0 && (
                <span className="ml-1 text-red-600 dark:text-red-400 font-semibold">
                  +{event.daysOverdue}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex flex-col">
          {/* Header skeleton */}
          <div className="flex items-center justify-between pb-4">
            <Skeleton className="h-7 w-40" />
            <div className="flex gap-1">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>

          {/* Calendar grid skeleton */}
          <div className="border border-muted rounded-lg overflow-hidden">
            {/* Week day headers */}
            <div className="grid grid-cols-7 border-b border-muted bg-muted/30">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="border-r border-b border-muted last:border-r-0 [&:nth-child(7n)]:border-r-0 p-2 flex flex-col"
                  style={{ minHeight: "150px" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Skeleton className="h-5 w-6" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex flex-col gap-1">
                      {/* Random skeleton events to make it look realistic */}
                      {i % 4 === 0 && <Skeleton className="h-6 w-full" />}
                      {i % 7 === 0 && <Skeleton className="h-6 w-full" />}
                      {i % 11 === 0 && <Skeleton className="h-6 w-full" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-full">
        <Calendar 
          minHeight="150px"
          renderDay={renderDay}
        />
      </div>
      
      {selectedEvent && (
        <LogAttemptDialog
          problemKey={selectedEvent.problemKey}
          problemTitle={selectedEvent.title}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => {
            // Reload due problems after logging attempt
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
