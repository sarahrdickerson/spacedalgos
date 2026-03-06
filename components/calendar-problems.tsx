"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { LogAttemptDialog } from "@/components/log-attempt-dialog"
import { ViewAttemptDialog } from "@/components/view-attempt-dialog"
import { DashboardData } from "@/app/(protected)/_components/dashboard-provider"
import LegendPopover from "./calendar/legend-popover"
import { CustomCalendar } from "./ui/custom-calendar"

interface PastAttempt {
  problem_id: string
  problem_key: string
  problem_title: string
  difficulty: "Easy" | "Medium" | "Hard"
  category: string
  attempted_at: string
  grade: 0 | 1 | 2
  stage: number
  attempt_number: number
}

interface UpcomingReview {
  problem_id: string
  problem_key: string
  problem_title: string
  difficulty: "Easy" | "Medium" | "Hard"
  category: string
  next_review_at: string
  stage: number
  attempt_count: number
}

interface ProjectedNew {
  problem_id: string
  problem_key: string
  problem_title: string
  difficulty: "Easy" | "Medium" | "Hard"
  category: string
  projected_date: string | null
  is_today_new: boolean
  order_index: number
}

interface CalendarData {
  past_attempts: PastAttempt[]
  upcoming_reviews: UpcomingReview[]
  projected_new: ProjectedNew[]
}

interface CalendarEvent {
  id: string
  title: string
  problemKey: string
  date: Date
  isPast: boolean
  isProjected?: boolean
  stage?: number
  grade?: 0 | 1 | 2
  difficulty: "Easy" | "Medium" | "Hard"
  attemptNumber?: number
}

interface CalendarProblemsProps {
  data: DashboardData | null;
  loading: boolean;
  error?: unknown;
  onRefresh?: () => Promise<void>;
}

export function CalendarProblems({ data, loading, error, onRefresh }: CalendarProblemsProps) {
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [viewAttemptOpen, setViewAttemptOpen] = React.useState(false)
  const [calendarData, setCalendarData] = React.useState<CalendarData | null>(null)
  const [calendarLoading, setCalendarLoading] = React.useState(true)
  const [calendarError, setCalendarError] = React.useState<string | null>(null)
  const lastFetchedKeyRef = React.useRef<string | null>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  const fetchCalendarData = React.useCallback(async (forceRefresh = false) => {
    const activeListKey = data?.activeList?.key

    if (!activeListKey) {
      setCalendarData(null)
      setCalendarLoading(false)
      lastFetchedKeyRef.current = null
      return
    }

    // Skip fetch if we already have data for this list (unless forced)
    if (!forceRefresh && lastFetchedKeyRef.current === activeListKey) {
      return
    }

    // Abort any existing request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setCalendarLoading(true)
    setCalendarError(null)

    try {
      const response = await fetch(
        `/api/problemlists/${encodeURIComponent(activeListKey)}/calendar`,
        { signal }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch calendar data")
      }

      const calData = await response.json()
      
      // Only update state if request wasn't aborted
      if (!signal.aborted) {
        setCalendarData(calData)
        lastFetchedKeyRef.current = activeListKey
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      if (!signal.aborted) {
        setCalendarError(err instanceof Error ? err.message : "Unknown error")
      }
    } finally {
      if (!signal.aborted) {
        setCalendarLoading(false)
      }
    }
  }, [data?.activeList?.key])

  // Fetch calendar data when active plan changes
  React.useEffect(() => {
    fetchCalendarData()
    
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [fetchCalendarData])

  // Convert calendar data to events — must live before any conditional returns (Rules of Hooks)
  const events: CalendarEvent[] = React.useMemo(() => {
    if (!calendarData) return []

    const pastEvents: CalendarEvent[] = calendarData.past_attempts.map((attempt) => ({
      id: `past-${attempt.problem_id}-${attempt.attempted_at}`,
      title: attempt.problem_title,
      problemKey: attempt.problem_key,
      date: new Date(attempt.attempted_at),
      isPast: true,
      grade: attempt.grade,
      stage: attempt.stage,
      difficulty: attempt.difficulty,
      attemptNumber: attempt.attempt_number,
    }))

    const upcomingEvents: CalendarEvent[] = calendarData.upcoming_reviews.map((review) => ({
      id: `upcoming-${review.problem_id}`,
      title: review.problem_title,
      problemKey: review.problem_key,
      date: new Date(review.next_review_at),
      isPast: false,
      stage: review.stage,
      difficulty: review.difficulty,
      attemptNumber: review.attempt_count + 1,
    }))

    // Parse projected_date as local date (YYYY-MM-DD) to avoid UTC-midnight timezone shift.
    // is_today_new items carry no date string — resolve to client's local today instead.
    const projectedEvents: CalendarEvent[] = (calendarData.projected_new ?? []).map((proj) => {
      let date: Date
      if (proj.is_today_new) {
        const now = new Date()
        date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else {
        const [y, m, d] = proj.projected_date!.split("-").map(Number)
        date = new Date(y, m - 1, d)
      }
      return {
        id: `projected-${proj.problem_id}`,
        title: proj.problem_title,
        problemKey: proj.problem_key,
        date,
        isPast: false,
        isProjected: true,
        difficulty: proj.difficulty,
      }
    })

    return [...pastEvents, ...upcomingEvents, ...projectedEvents]
  }, [calendarData])

  // Handle error state
  if (error) {
    const errorMessage = error instanceof Error ? error.message : typeof error === "string" ? error : "An unknown error occurred while loading the dashboard";
    
    return (
      <div className="w-full">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive font-medium mb-3">
            {errorMessage}
          </p>
          {onRefresh && (
            <button
              onClick={() => onRefresh()}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  // Handle calendar error state
  if (calendarError) {
    return (
      <div className="w-full">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive font-medium mb-3">
            {calendarError}
          </p>
          <button
            onClick={() => fetchCalendarData(true)}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Handle missing data (but not loading)
  if (!loading && !data) {
    return (
      <div className="w-full">
        <div className="rounded-lg border border-muted bg-muted/10 p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Failed to load dashboard data
          </p>
          {onRefresh && (
            <button
              onClick={() => onRefresh()}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

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
          if (event.isPast) {
            // Past attempts - lighter/muted styling based on stage BEFORE the attempt
            const stageColor = 
              event.stage === 3
                ? "bg-green-500/5 text-green-700/60 dark:text-green-400/60 hover:bg-green-500/10"
                : event.stage === 2
                  ? "bg-blue-500/5 text-blue-700/60 dark:text-blue-400/60 hover:bg-blue-500/10"
                  : event.stage === 1
                    ? "bg-yellow-500/5 text-yellow-700/60 dark:text-yellow-400/60 hover:bg-yellow-500/10"
                    : "bg-gray-500/5 text-gray-700/60 dark:text-gray-400/60 hover:bg-gray-500/10"

            return (
              <button
                key={event.id}
                type="button"
                className={cn(
                  "text-xs px-2 py-1 rounded text-left w-full opacity-60 transition-colors cursor-pointer",
                  stageColor
                )}
                title={`${event.title} - Stage ${event.stage || 0} attempt (Grade ${event.grade})`}
                onClick={() => {
                  setSelectedEvent(event)
                  setViewAttemptOpen(true)
                }}
              >
                {event.title} <span className="text-muted-foreground">#{event.attemptNumber}</span>
              </button>
            )
          } else if (event.isProjected) {
            // Projected new problems — dashed outline, violet/muted, clickable to log first attempt
            return (
              <button
                key={event.id}
                type="button"
                className="text-xs px-2 py-1 rounded text-left w-full border border-dashed border-violet-400/50 bg-violet-500/5 text-violet-700/60 dark:text-violet-400/60 hover:bg-violet-500/10 transition-colors"
                title={`${event.title} — projected new problem (click to start)`}
                onClick={() => {
                  setSelectedEvent(event)
                  setDialogOpen(true)
                }}
              >
                {event.title}
              </button>
            )
          } else {
            // Upcoming reviews - normal styling by stage
            const stageColor =
              event.stage === 1
                ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20"
                : event.stage === 2
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20"
                  : "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"

            return (
              <button
                key={event.id}
                type="button"
                className={cn(
                  "text-xs px-2 py-1 rounded transition-colors text-left w-full",
                  stageColor
                )}
                title={`${event.title} - Stage ${event.stage} (Due for review)`}
                onClick={() => {
                  setSelectedEvent(event)
                  setDialogOpen(true)
                }}
              >
                {event.title} <span className="text-muted-foreground">#{event.attemptNumber}</span>
              </button>
            )
          }
        })}
      </div>
    )
  }

  if (loading || calendarLoading) {
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
      <div className="w-full space-y-4">
        {/* Legend in Popover */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Repetition Calendar</h3>
          <LegendPopover />
        </div>

        <CustomCalendar 
          minHeight="150px"
          renderDay={renderDay}
        />
      </div>
      
      {selectedEvent && dialogOpen && !selectedEvent.isPast && (
        <LogAttemptDialog
          problemKey={selectedEvent.problemKey}
          problemTitle={selectedEvent.title}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={async () => {
            // Refresh both dashboard and calendar data after logging attempt
            await onRefresh?.();
            await fetchCalendarData(true);
          }}
        />
      )}

      {selectedEvent && viewAttemptOpen && selectedEvent.isPast && (() => {
        // Runtime validation: ensure grade is a valid value
        const grade = selectedEvent.grade ?? 0
        const validGrade: 0 | 1 | 2 = 
          grade === 0 || grade === 1 || grade === 2 ? grade : 0
        
        return (
          <ViewAttemptDialog
            problemKey={selectedEvent.problemKey}
            problemTitle={selectedEvent.title}
            attemptDate={selectedEvent.date.toISOString()}
            grade={validGrade}
            open={viewAttemptOpen}
            onOpenChange={setViewAttemptOpen}
          />
        )
      })()}
    </>
  )
}
