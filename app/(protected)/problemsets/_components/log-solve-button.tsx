import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import React from "react";

type LogSolveButtonProps = {
  problemKey: string;
  problemTitle: string;
};
const LogSolveButton = ({ problemKey, problemTitle }: LogSolveButtonProps) => {
  const [confidence, setConfidence] = React.useState<string>("");
  const [timeSpent, setTimeSpent] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");
  const [noteOpen, setNoteOpen] = React.useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = {
      problemKey,
      problemTitle,
      confidence,
      timeSpent,
      note,
      timestamp: new Date().toISOString(),
    };
    console.log("Form submitted:", formData);
    // TODO: call API to save this data to the database and spinner the save button while its saving until response received

    // Reset form and close dialog
    setConfidence("");
    setTimeSpent("");
    setNote("");
    setNoteOpen(false);
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Log Solve</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Log Solve — {problemTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">
            <FieldGroup>
              <Field>
                <Label>How did it go?</Label>
                <div className="flex flex-col gap-2 mt-2">
                  <Button
                    type="button"
                    variant={confidence === "confident" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setConfidence("confident")}
                  >
                    ✅ Solved confidently
                  </Button>
                  <Button
                    type="button"
                    variant={confidence === "struggled" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setConfidence("struggled")}
                  >
                    🙂 Solved but struggled
                  </Button>
                  <Button
                    type="button"
                    variant={confidence === "failed" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setConfidence("failed")}
                  >
                    ❌ Couldn't solve
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
                    variant={timeSpent === "<15m" ? "default" : "outline"}
                    onClick={() => setTimeSpent("<15m")}
                  >
                    &lt;15m
                  </Button>
                  <Button
                    type="button"
                    variant={timeSpent === "15-30m" ? "default" : "outline"}
                    onClick={() => setTimeSpent("15-30m")}
                  >
                    15-30m
                  </Button>
                  <Button
                    type="button"
                    variant={timeSpent === "30-60m" ? "default" : "outline"}
                    onClick={() => setTimeSpent("30-60m")}
                  >
                    30–60m
                  </Button>
                  <Button
                    type="button"
                    variant={timeSpent === "60m+" ? "default" : "outline"}
                    onClick={() => setTimeSpent("60m+")}
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
            <Button type="submit" disabled={!confidence}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LogSolveButton;
