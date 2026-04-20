"use client";

import { Button } from "@/components/ui/button";
import React from "react";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { LogAttemptDialog } from "@/components/log-attempt-dialog";
import { Problem, useDashboard } from "../../_components/dashboard-provider";

type LogSolveButtonProps = {
  problem: Problem;
};

const LogSolveButton = ({ problem }: LogSolveButtonProps) => {
  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
  const { refreshData } = useDashboard();

  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        <PlusCircledIcon /> Log Attempt
      </Button>
      <LogAttemptDialog
        problem={problem}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refreshData}
      />
    </>
  );
};

export default LogSolveButton;
