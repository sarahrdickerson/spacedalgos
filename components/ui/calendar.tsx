"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CalendarProps extends React.ComponentProps<"div"> {
  month?: Date
  onMonthChange?: (date: Date) => void
  renderDay?: (date: Date) => React.ReactNode
  minHeight?: string
}

function Calendar({
  className,
  month = new Date(),
  onMonthChange,
  renderDay,
  minHeight = "120px",
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(month)

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days in the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    // Pad the end to complete the final week (make sure we have complete rows of 7)
    const remainingCells = days.length % 7
    if (remainingCells !== 0) {
      for (let i = 0; i < 7 - remainingCells; i++) {
        days.push(null)
      }
    }

    return days
  }

  const days = getDaysInMonth(currentMonth)
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const monthYear = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-lg font-semibold">{monthYear}</h2>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handlePreviousMonth}
            aria-label="Previous month"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date()
              setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
              onMonthChange?.(new Date(today.getFullYear(), today.getMonth(), 1))
            }}
            aria-label="Current date"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-muted rounded-lg overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b border-muted bg-muted/30">
          {weekDays.map((day) => (
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
          {days.map((date, index) => (
            <CalendarDay
              key={index}
              date={date}
              minHeight={minHeight}
              renderDay={renderDay}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface CalendarDayProps {
  date: Date | null
  minHeight: string
  renderDay?: (date: Date) => React.ReactNode
}

function CalendarDay({ date, minHeight, renderDay }: CalendarDayProps) {
  const isToday = date
    ? date.toDateString() === new Date().toDateString()
    : false

  const isWeekend = date ? (date.getDay() === 0 || date.getDay() === 6) : false

  return (
    <div
      className={cn(
        "border-r border-b border-muted last:border-r-0 [&:nth-child(7n)]:border-r-0 p-2 flex flex-col",
        isWeekend && "bg-muted/10",
        !date && "bg-muted/5"
      )}
      style={{ minHeight }}
    >
      {date && (
        <>
          <div className="flex items-center justify-between mb-1">
            <span
              className={cn(
                "text-sm font-medium",
                isToday && "flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground"
              )}
            >
              {date.getDate()}
            </span>
          </div>
          {renderDay && (
            <div className="flex-1 overflow-hidden">
              {renderDay(date)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export { Calendar }
