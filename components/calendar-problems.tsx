"use client"

import React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface DueProblem {
  id: string
  key: string
  title: string
  difficulty: string
  category: string
  leetcode_url: string
  order_index: number
  progress: {
    stage: number
    next_review_at: string
    attempt_count: number
    interval_days: number
    days_overdue: number
  }
}

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

export function CalendarProblems() {
  const [events, setEvents] = React.useState<CalendarEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const loadDueProblems = async () => {
      try {
        const response = await fetch("/api/problemlists/blind75/due")
        if (!response.ok) {
          throw new Error("Failed to load due problems")
        }
        const data = await response.json()

        console.log("Due problems data:", data)
        // Convert due problems to calendar events
        const calendarEvents: CalendarEvent[] = data.due_problems.map(
          (problem: DueProblem) => ({
            id: problem.id,
            title: problem.title,
            problemKey: problem.key,
            date: new Date(problem.progress.next_review_at),
            stage: problem.progress.stage,
            daysOverdue: problem.progress.days_overdue,
            attemptCount: problem.progress.attempt_count,
            difficulty: problem.difficulty as "Easy" | "Medium" | "Hard",
          })
        )

        setEvents(calendarEvents)
        setLoading(false)
      } catch (e) {
        console.error(e)
        setError("Failed to load due problems")
        setLoading(false)
      }
    }

    loadDueProblems()
  }, [])

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(
      (event) => event.date.toDateString() === date.toDateString()
    )
  }

  const renderDay = (date: Date) => {
    const events = getEventsForDate(date)

    return (
      <div className="flex flex-col gap-1">
        {events.map((event) => {
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
            <div
              key={event.id}
              className={cn(
                "text-xs px-2 py-1 rounded cursor-pointer transition-colors",
                stageColor,
                overdueStyle
              )}
              title={`${event.title} - Stage ${event.stage}, Attempt #${event.attemptCount + 1}${event.daysOverdue > 0 ? ` (${event.daysOverdue}d overdue)` : ""}`}
            >
              {event.title} <span className="text-muted-foreground">#{event.attemptCount + 1}</span>
              {event.daysOverdue > 0 && (
                <span className="ml-1 text-red-600 dark:text-red-400 font-semibold">
                  +{event.daysOverdue}
                </span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="w-full p-6">
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

  if (error) {
    return (
      <div className="w-full p-6">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="w-full p-6">
      <Calendar 
        minHeight="150px"
        renderDay={renderDay}
      />
    </div>
  )
}
