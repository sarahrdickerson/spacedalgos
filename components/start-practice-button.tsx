"use client";
import { Button } from "@/components/ui/button";
import { CaretRightIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import React from "react";

const StartPracticeButton = () => {
  const router = useRouter();
  return (
    <Button onClick={() => router.push("/dash")} size="sm">
      Start Practice <CaretRightIcon />
    </Button>
  );
};

export default StartPracticeButton;
