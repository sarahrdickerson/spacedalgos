import React from "react";
import ContinueForm from "./_components/continue-form";

const ContinuePage = () => {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ContinueForm />
      </div>
    </div>
  );
};

export default ContinuePage;
