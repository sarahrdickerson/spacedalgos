"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown, ChevronUp } from "lucide-react"

interface Attempt {
  id: string
  grade: 0 | 1 | 2
  time_bucket: string | null
  note: string | null
  attempted_at: string
}

interface AttemptHistory {
  problem: {
    id: string
    title: string
  }
  attempts: Attempt[]
}

interface ViewAttemptDialogProps {
  problemKey: string
  problemTitle: string
  attemptDate: string
  grade: Attempt["grade"]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const gradeLabels: Record<Attempt["grade"], string> = {
  0: "Again - Need to review",
  1: "Good - Solved with some effort",
  2: "Easy - Solved quickly",
}

const gradeText: Record<Attempt["grade"], string> = {
  0: "Again/Hard",
  1: "Good",
  2: "Easy",
}

const gradeColors: Record<Attempt["grade"], string> = {
  0: "text-red-600 dark:text-red-400",
  1: "text-yellow-600 dark:text-yellow-400",
  2: "text-green-600 dark:text-green-400",
}

export function ViewAttemptDialog({
  problemKey,
  problemTitle,
  attemptDate,
  grade,
  open,
  onOpenChange,
}: ViewAttemptDialogProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [history, setHistory] = React.useState<AttemptHistory | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  const fetchHistory = React.useCallback(async (signal: AbortSignal) => {
    if (!problemKey) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/problems/${encodeURIComponent(problemKey)}/history`,
        { signal }
      )
      if (!response.ok) {
        throw new Error("Failed to fetch attempt history")
      }
      const data = await response.json()
      
      // Only update state if request wasn't aborted
      if (!signal.aborted) {
        setHistory(data)
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      if (!signal.aborted) {
        setError(err instanceof Error ? err.message : "Unknown error")
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }, [problemKey])

  const handleExpandToggle = () => {
    setExpanded(prev => {
      const nextExpanded = !prev
      if (nextExpanded && !history) {
        // Abort any existing request before starting a new one
        abortControllerRef.current?.abort()
        abortControllerRef.current = new AbortController()
        fetchHistory(abortControllerRef.current.signal)
      }
      return nextExpanded
    })
  }

  // Reset state when dialog closes and abort in-flight requests
  React.useEffect(() => {
    if (!open) {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      setExpanded(false)
      setHistory(null)
      setError(null)
    }
  }, [open])

  // Cleanup in-flight requests on unmount
  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
    }
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const formatTime = (timeBucket: string | null) => {
    if (!timeBucket) return "N/A"
    return timeBucket
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{problemTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current attempt details */}
          <div className="rounded-lg p-4 bg-muted/30">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm text-muted-foreground">Attempt Date</div>
                <div className="font-medium">{formatDate(attemptDate)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Grade</div>
                <div className={`font-semibold ${gradeColors[grade]}`}>
                  {gradeText[grade]}
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {gradeLabels[grade]}
            </div>
          </div>

          {/* Expand/collapse button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleExpandToggle}
            disabled={loading}
          >
            {loading ? (
              "Loading history..."
            ) : (
              <>
                {expanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Hide full history
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    View full history
                  </>
                )}
              </>
            )}
          </Button>

          {/* Full history section */}
          {expanded && (
            <div className="space-y-3">
              {error && (
                <div className="text-sm text-destructive p-3 rounded-lg bg-destructive/10">
                  {error}
                </div>
              )}

              {loading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              )}

              {history && !loading && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    All Attempts ({history.attempts.length})
                  </div>
                  {history.attempts.map((attempt, index) => (
                    <div
                      key={attempt.id}
                      className="bg-muted/30 rounded-lg p-3 text-sm space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">
                            Attempt #{history.attempts.length - index}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(attempt.attempted_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Time: </span>
                            <span className="font-medium">
                              {formatTime(attempt.time_bucket)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Grade: </span>
                            <span className={`font-semibold ${gradeColors[attempt.grade]}`}>
                              {gradeText[attempt.grade]}
                            </span>
                          </div>
                        </div>
                      </div>
                      {attempt.note && (
                        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                          {attempt.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
