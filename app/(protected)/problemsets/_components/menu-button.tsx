import React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CounterClockwiseClockIcon,
  DotsVerticalIcon,
  ResetIcon,
} from "@radix-ui/react-icons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MenuButtonProps = {
  problemKey: string;
  problemTitle: string;
};

type AttemptHistory = {
  id: string;
  grade: number;
  time_bucket: string | null;
  note: string | null;
  attempted_at: string;
};

const MenuButton = ({ problemKey, problemTitle }: MenuButtonProps) => {
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const [history, setHistory] = React.useState<AttemptHistory[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  const problemHistory = async () => {
    setIsHistoryOpen(true);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/problems/${encodeURIComponent(problemKey)}/history`);
      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }
      const data = await response.json();
      setHistory(data.attempts || []);
    } catch (error) {
      console.error("Error fetching history:", error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };
  
  const confirmReset = () => {
    setIsResetConfirmOpen(true);
  };

  const resetProblemProgress = async () => {
    setResetting(true);
    
    try {
      const response = await fetch(
        `/api/problems/${encodeURIComponent(problemKey)}/reset`,
        { method: "DELETE" }
      );
      
      if (!response.ok) {
        throw new Error("Failed to reset progress");
      }
      
      // Reload the page to update the UI
      window.location.reload();
    } catch (error) {
      console.error("Error resetting progress:", error);
      alert("Failed to reset progress. Please try again.");
    } finally {
      setResetting(false);
      setIsResetConfirmOpen(false);
    }
  };

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <DotsVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={problemHistory}>
              <CounterClockwiseClockIcon /> History
            </DropdownMenuItem>
            <DropdownMenuItem onClick={confirmReset}>
              <ResetIcon /> Reset Progress
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>History — {problemTitle}</DialogTitle>
          </DialogHeader>
          <div className="-mx-4 no-scrollbar max-h-[60vh] overflow-y-auto px-4">
            {loading ? (
              <div className="rounded-md border">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[160px]" />
                    <col className="w-[80px]" />
                    <col className="w-[90px]" />
                    <col />
                  </colgroup>
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Grade</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-14" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : history.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No attempts yet</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[160px]" />
                    <col className="w-[80px]" />
                    <col className="w-[90px]" />
                    <col />
                  </colgroup>
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Grade</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((attempt) => {
                      const date = new Date(attempt.attempted_at);
                      const gradeLabels = { 0: "Again", 1: "Good", 2: "Easy" };
                      const gradeColors = {
                        0: "text-red-600 dark:text-red-400",
                        1: "text-yellow-600 dark:text-yellow-400",
                        2: "text-green-600 dark:text-green-400",
                      };
                      
                      return (
                        <tr key={attempt.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium ${gradeColors[attempt.grade as 0 | 1 | 2]}`}>
                            {gradeLabels[attempt.grade as 0 | 1 | 2] || attempt.grade}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {attempt.time_bucket || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground break-words">
                            {attempt.note || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Are you sure you want to reset your progress for{" "}
              <span className="italic underline">{problemTitle}</span>?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will permanently delete all attempts and progress for this problem. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResetConfirmOpen(false)}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={resetProblemProgress}
              disabled={resetting}
            >
              {resetting ? "Resetting..." : "Reset Progress"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuButton;
