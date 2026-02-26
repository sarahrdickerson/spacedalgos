"use client"

import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CalendarEvent {
  id: string
  title: string
  repetitionNumber: number
  date: Date
  color?: "blue" | "green" | "red" | "purple" | "orange"
}

// Example events
const sampleEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Two Sum",
    repetitionNumber: 1,
    date: new Date(2026, 1, 20),
    color: "blue",
  },
  {
    id: "2",
    title: "Two Sum",
    repetitionNumber: 2,
    date: new Date(2026, 1, 25),
    color: "green",
  },
  {
    id: "3",
    title: "Reverse Linked List",
    repetitionNumber: 1,
    date: new Date(2026, 1, 21),
    color: "red",
  },
  {
    id: "4",
    title: "Reverse Linked List",
    repetitionNumber: 2, 
    date: new Date(2026, 1, 26),
    color: "purple",
  },
  {
    id: "5",
    title: "Binary Tree Inorder Traversal",
    repetitionNumber: 1,
    date: new Date(2026, 1, 18),
    color: "orange",
  },
]

export function CalendarProblems() {
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return sampleEvents.filter(
      (event) => event.date.toDateString() === date.toDateString()
    )
  }

  const renderDay = (date: Date) => {
    const events = getEventsForDate(date)

    return (
      <div className="flex flex-col gap-1">
        {/* TODO: add onClick to the events to link to "logging a solve" */}
        {events.map((event) => (
          <div
            key={event.id}
            className={cn(
              "text-xs px-2 py-1 rounded cursor-pointer transition-colors",
              event.color === "blue" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20",
              event.color === "green" && "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20",
              event.color === "red" && "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
              event.color === "purple" && "bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20",
              event.color === "orange" && "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20",
              !event.color && "bg-muted text-foreground hover:bg-muted/80"
            )}
            title={event.title}
          >
            {event.title} ({event.repetitionNumber})
          </div>
        ))}
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
