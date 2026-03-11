"use client";

import React from "react";
import { toast } from "sonner";
import { TriangleAlertIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDashboard } from "../../_components/dashboard-provider";

const PACE_OPTIONS = [
  { key: "leisurely", label: "Leisurely", new_per_day: 1, review_per_day: 2 },
  { key: "normal", label: "Normal", new_per_day: 2, review_per_day: 4 },
  {
    key: "accelerated",
    label: "Accelerated",
    new_per_day: 3,
    review_per_day: 6,
  },
] as const;

type Pace = "leisurely" | "normal" | "accelerated";

interface ChangePaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPace: string;
  listId: string;
  totalProblems: number;
  completedProblems: number;
  onSuccess?: () => void;
}

function calcEstDate(remaining: number, newPerDay: number): string {
  const daysLeft = Math.ceil(remaining / newPerDay);
  const est = new Date();
  est.setDate(est.getDate() + daysLeft);
  return est.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ChangePaceDialog({
  open,
  onOpenChange,
  currentPace,
  listId,
  totalProblems,
  completedProblems,
  onSuccess,
}: ChangePaceDialogProps) {
  const { refreshData } = useDashboard();
  const [selectedPace, setSelectedPace] = React.useState<Pace>(
    (currentPace as Pace) || "normal",
  );
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setSelectedPace((currentPace as Pace) || "normal");
    }
  }, [open, currentPace]);

  const remaining = totalProblems - completedProblems;
  const currentOption = PACE_OPTIONS.find((p) => p.key === currentPace);
  const selectedOption = PACE_OPTIONS.find((p) => p.key === selectedPace);
  const isPaceChanged = selectedPace !== currentPace;

  const currentEstDate =
    currentOption && remaining > 0
      ? calcEstDate(remaining, currentOption.new_per_day)
      : null;
  const newEstDate =
    selectedOption && remaining > 0
      ? calcEstDate(remaining, selectedOption.new_per_day)
      : null;

  const handleSave = async () => {
    if (!isPaceChanged) return;
    const option = PACE_OPTIONS.find((p) => p.key === selectedPace)!;

    setIsSaving(true);
    try {
      const response = await fetch("/api/user/active-study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          list_id: listId,
          pace: selectedPace,
          new_per_day: option.new_per_day,
          review_per_day: option.review_per_day,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to update pace" }));
        throw new Error(errorData.error || "Failed to update pace");
      }

      toast.success(`Pace updated to ${option.label}`);
      onOpenChange(false);
      onSuccess?.();
      refreshData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update pace",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 bg-background px-6 pt-6 pb-4">
          <DialogTitle className="text-base sm:text-lg">
            Change Study Pace
          </DialogTitle>
        </DialogHeader>

        <div className="pb-2 px-6 flex flex-col gap-4">
          {/* Pace options */}
          <div className="flex flex-col gap-2">
            {PACE_OPTIONS.map((option) => {
              const isSelected = selectedPace === option.key;
              const isCurrent = currentPace === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedPace(option.key)}
                  className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option.label}</span>
                    {isCurrent && (
                      <span className="text-xs text-muted-foreground">
                        current
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {option.new_per_day} new/day · {option.review_per_day}{" "}
                    reviews/day
                  </p>
                </button>
              );
            })}
          </div>

          {/* Impact preview */}
          {isPaceChanged && selectedOption && currentOption && (
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm flex flex-col gap-1">
              {remaining > 0 && currentEstDate && newEstDate && (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Estimated first pass:
                  </span>{" "}
                  {currentEstDate} → {newEstDate}
                </p>
              )}
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  New problems per day:
                </span>{" "}
                {currentOption.new_per_day} → {selectedOption.new_per_day}
              </p>
            </div>
          )}

          {/* Warning */}
          <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Changing your pace may have unintended effects on your review
              schedule. Your existing intervals are preserved, but your daily
              queue and estimated completion date will update immediately.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6">
          <DialogClose asChild>
            <Button variant="outline" className="whitespace-normal text-sm">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={!isPaceChanged || isSaving}
            className={`whitespace-normal text-sm ${isSaving ? "cursor-not-allowed" : ""}`}
          >
            {isSaving ? "Saving..." : "Save Pace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
