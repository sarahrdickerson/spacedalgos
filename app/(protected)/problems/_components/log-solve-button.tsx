"use client";

import { Button } from "@/components/ui/button";
import React from "react";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { LogAttemptDialog } from "@/components/log-attempt-dialog";
import { useDashboard } from "../../_components/dashboard-provider";

type LogSolveButtonProps = {
  problemKey: string;
  problemTitle: string;
};

const LogSolveButton = ({ problemKey, problemTitle }: LogSolveButtonProps) => {
  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
  const { refreshData } = useDashboard();

  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        <PlusCircledIcon /> Log Attempt
      </Button>
      <LogAttemptDialog
        problemKey={problemKey}
        problemTitle={problemTitle}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refreshData}
      />
    </>
  );
};

export default LogSolveButton;
