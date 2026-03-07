"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import Link from "next/link";
import { ExternalLinkIcon } from "@radix-ui/react-icons";

type LogAttemptDialogProps = {
  problemKey: string;
  problemTitle: string;
  problemLink: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function LogAttemptDialog({
  problemKey,
  problemTitle,
  problemLink,
  open,
  onOpenChange,
  onSuccess,
}: LogAttemptDialogProps) {
  const [grade, setGrade] = React.useState<0 | 1 | 2 | null>(null);
  const [timeSpent, setTimeSpent] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");
  const [noteOpen, setNoteOpen] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (grade === null) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/problems/${encodeURIComponent(problemKey)}/attempts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            grade,
            time_bucket: timeSpent || null,
            note: note || null,
            attempted_at: new Date().toISOString(),
            localDate: new Date().toLocaleDateString("en-CA"),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to log attempt" }));
        throw new Error(errorData.error || "Failed to log attempt");
      }

      toast.success("Attempt logged successfully!");

      // Reset form and close dialog
      setGrade(null);
      setTimeSpent("");
      setNote("");
      setNoteOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error logging attempt:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to log attempt"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Log Attempt —{" "}
              <Link
                href={problemLink}
                target="_blank"
                className="inline-flex items-center gap-1 hover:underline hover:text-muted-foreground transition-all duration-300"
              >
                {problemTitle}{" "}
                <ExternalLinkIcon className="text-muted-foreground" />
              </Link>
            </DialogTitle>
            <DialogDescription>
              Record how well you solved this problem to track your progress.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">
            <FieldGroup>
              <Field>
                <Label>How did it go?</Label>
                <Button
                  type="button"
                  variant={grade === 2 ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setGrade(2)}
                >
                  ✅ Easy, solved confidently without hints
                </Button>
                <Button
                  type="button"
                  variant={grade === 1 ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setGrade(1)}
                >
                  👍 Good, solved with some effort or hints
                </Button>
                <div className="flex flex-col gap-2 mt-2">
                  <Button
                    type="button"
                    variant={grade === 0 ? "destructive" : "outline"}
                    className="justify-start"
                    onClick={() => setGrade(0)}
                  >
                    ❌ Hard, struggled a lot or couldn't solve even with hints
                  </Button>
                </div>
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <Label>(Optional) Time spent</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={timeSpent === "0-15" ? "default" : "outline"}
                    onClick={() => setTimeSpent("0-15")}
                  >
                    &lt;15m
                  </Button>
                  <Button
                    type="button"
                    variant={timeSpent === "15-30" ? "default" : "outline"}
                    onClick={() => setTimeSpent("15-30")}
                  >
                    15-30m
                  </Button>
                  <Button
                    type="button"
                    variant={timeSpent === "30-60" ? "default" : "outline"}
                    onClick={() => setTimeSpent("30-60")}
                  >
                    30–60m
                  </Button>
                  <Button
                    type="button"
                    variant={timeSpent === "60+" ? "default" : "outline"}
                    onClick={() => setTimeSpent("60+")}
                  >
                    60m+
                  </Button>
                </div>
              </Field>
            </FieldGroup>

            <Collapsible open={noteOpen} onOpenChange={setNoteOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex items-center gap-2 p-0 h-auto font-normal text-sm"
                >
                  (Optional) Add note
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add any notes about this solve..."
                    className="min-h-[100px]"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={grade === null || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
