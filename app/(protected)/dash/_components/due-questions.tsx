import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const DueQuestions = () => {
  const questionStats = {
    dueToday: 5,
    completed: 20,
    weeksTotal: 16,
  };
  return (
    <div className="flex w-full flex-col">
      <h2 className="font-bold text-xl mb-4">Due Questions</h2>
      <Card>
        <CardContent>
          {questionStats.dueToday > 0 ? (
            <div className="flex flex-row gap-4 items-center">
              <div>
                <p className="font-medium text-md">
                  <span className="text-2xl font-bold">
                    {questionStats.dueToday}
                  </span>{" "}
                  due today
                </p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div>
                <p className="font-medium text-md">
                  <span className="text-2xl font-bold">
                    {questionStats.completed}
                  </span>{" "}
                  completed
                </p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div>
                <p className="font-medium text-md">
                  <span className="text-2xl font-bold">
                    {questionStats.weeksTotal}
                  </span>{" "}
                  weeks total
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You have no questions due for review today. Great job!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DueQuestions;
