import React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotsVerticalIcon, ResetIcon, TrashIcon } from "@radix-ui/react-icons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProblemList {
  id: string;
  key: string;
  name: string;
  description?: string;
  source?: string;
  version?: string;
}

const CurrentPlanMenuButton = (props: { 
  problemList: ProblemList | null;
  onPlanRemoved?: () => void;
}) => {
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);

  const [isResetting, setIsResetting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const confirmReset = () => {
    setIsResetConfirmOpen(true);
  };
  const confirmDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleReset = async () => {
    if (!props.problemList?.key) return;
    
    setIsResetting(true);
    try {
      const response = await fetch(
        `/api/problemlists/${encodeURIComponent(props.problemList.key)}/reset-progress`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to reset progress" }));
        throw new Error(errorData.error || "Failed to reset progress");
      }

      const data = await response.json();
      toast.success(`Progress reset for ${props.problemList.name}`);
      setIsResetConfirmOpen(false);
      
      // Trigger a page refresh to update stats
      if (props.onPlanRemoved) {
        props.onPlanRemoved();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error resetting progress:", error);
      toast.error(error instanceof Error ? error.message : "Failed to reset progress");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDelete = async () => {
    if (!props.problemList?.key) return;
    
    setIsDeleting(true);
    try {
      // First reset progress
      const resetResponse = await fetch(
        `/api/problemlists/${encodeURIComponent(props.problemList.key)}/reset-progress`,
        {
          method: "DELETE",
        }
      );

      if (!resetResponse.ok) {
        throw new Error("Failed to reset progress");
      }

      // Then remove active plan
      const deleteResponse = await fetch("/api/user/active-study-plan", {
        method: "DELETE",
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json().catch(() => ({ error: "Failed to remove plan" }));
        throw new Error(errorData.error || "Failed to remove plan");
      }

      toast.success("Study plan removed successfully");
      setIsDeleteConfirmOpen(false);
      
      // Trigger a page refresh or callback
      if (props.onPlanRemoved) {
        props.onPlanRemoved();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove plan");
    } finally {
      setIsDeleting(false);
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
            <DropdownMenuItem onClick={confirmReset}>
              <ResetIcon /> Reset Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={confirmDelete}>
              <TrashIcon /> Delete Plan
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {isResetConfirmOpen && (
        <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Reset</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              Are you sure you want to reset your progress for{" "}
              {props.problemList?.name}? This action cannot be undone.
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleReset}
                className={isResetting ? "cursor-not-allowed" : ""}
                disabled={isResetting}
              >
                {isResetting ? "Resetting..." : "Confirm Reset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isDeleteConfirmOpen && (
        <Dialog
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              Are you sure you want to remove <strong>{props.problemList?.name}</strong> as your active study plan? This will also delete all your progress for problems in this list. This action cannot be undone.
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDelete}
                className={isDeleting ? "cursor-not-allowed" : ""}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CurrentPlanMenuButton;
