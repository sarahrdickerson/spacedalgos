import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Problem } from "../../_components/dashboard-provider";

interface DueQuestionCardProps {
  problems: Problem[];
  onProblemClick: (problem: Problem) => void;
  emptyMessage?: string;
}

export function DueQuestionCard({
  problems,
  onProblemClick,
  emptyMessage = "No problems to review.",
}: DueQuestionCardProps) {
  return (
    <Card className="flex flex-col max-h-[300px]">
      {problems.length > 0 ? (
        <div className="overflow-y-auto flex-1">
          <CardContent className="space-y-2">
            {problems.map((problem) => (
              <button
                key={problem.id}
                onClick={() => onProblemClick(problem)}
                className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{problem.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {problem.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      className={
                        problem.difficulty === "Easy"
                          ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                          : problem.difficulty === "Medium"
                            ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20"
                            : "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20"
                      }
                    >
                      {problem.difficulty}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </div>
      ) : (
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      )}
    </Card>
  );
}
