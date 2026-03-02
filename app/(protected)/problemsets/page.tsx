"use client";
import React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ExternalLink, History } from "lucide-react";
import LogSolveButton from "./_components/log-solve-button";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";

const ProblemSetsPage = () => {
  //   const [problemSets, setProblemSets] = React.useState<any>(null); // TODO: uncomment in future to support multiple problem sets/lists and selection of which to view. For now we just fetch and show the first one (blind75) for simplicity
  const [activeSet, setActiveSet] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const loadProblemSets = async () => {
      try {
        // Fetch problem lists from API
        const response = await fetch("/api/problems/problemlists");
        if (!response.ok) {
          throw new Error("Failed to load problem lists");
        }
        const json = await response.json();
        const data = Array.isArray(json?.data) ? json.data : [];

        if (data.length === 0) {
          //   setProblemSets([]);
          setActiveSet(null);
          setError("No problem sets available.");
          setLoading(false);
          return;
        }

        let foundKey = data[0]?.key || "blind75"; // default to blind75 if no lists found
        // setProblemSets(data);

        // Fetch the problem list with user progress
        const progressResponse = await fetch(
          "/api/problemlists/" + encodeURIComponent(foundKey) + "/progress"
        );
        if (!progressResponse.ok) {
          throw new Error("Failed to load problem list progress");
        }
        const { list, problems } = await progressResponse.json();

        if (!list || !Array.isArray(problems)) {
          throw new Error("Invalid problem list progress payload");
        }

        setActiveSet({ list, problems });
        setError(null);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError("Unable to load problem sets. Please try again later.");
        // setProblemSets([]);
        setActiveSet(null);
        setLoading(false);
      }
    };

    loadProblemSets();
  }, []);

  // Group problems by category and sort by order_index
  const groupedProblems = React.useMemo(() => {
    if (!activeSet) return {};

    const groups: Record<string, Array<(typeof activeSet.problems)[0]>> = {};

    activeSet.problems.forEach((problem: { category: any }) => {
      const category = problem.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(problem);
    });

    // Sort each group by order_index
    Object.keys(groups).forEach((category) => {
      groups[category].sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
      );
    });

    return groups;
  }, [activeSet]);

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Spinner className="w-8 h-8 text-primary" />
            <p className="text-muted-foreground">Loading problem sets...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <p className="text-destructive text-lg font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Reload page.
          </button>
        </div>
      )}
      {!loading && activeSet && (
        <div className="flex flex-col w-full gap-6">
          <h1 className="text-2xl font-bold">
            {activeSet.list.name ?? activeSet.list.key}
          </h1>
          <div className="flex flex-col gap-4 w-full">
            {Object.entries(groupedProblems).map(([category, problems]) => (
              <Collapsible
                key={category}
                className="w-full border border-muted rounded-lg"
              >
                <CollapsibleTrigger className="group flex items-center justify-between w-full p-4 text-lg font-semibold hover:bg-accent hover:rounded-sm transition-colors">
                  <div className="flex items-center gap-2">
                    {category}
                    <Badge variant="secondary">{problems.length}</Badge>
                  </div>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="w-full">
                  <div className="flex flex-col gap-2 w-full p-4 pt-0">
                    {problems.map((problem) => {
                      const progress = problem.progress;
                      const hasProgress = progress && progress.stage > 0;
                      
                      // Stage labels
                      const stageLabels: Record<number, string> = {
                        1: "Learning",
                        2: "Reinforcing", 
                        3: "Mastered"
                      };
                      
                      // Calculate days until review
                      let daysUntilReview: number | null = null;
                      if (progress?.next_review_at) {
                        const nextReview = new Date(progress.next_review_at);
                        const now = new Date();
                        const diffMs = nextReview.getTime() - now.getTime();
                        daysUntilReview = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                      }

                      return (
                        <div
                          key={problem.key}
                          className="flex flex-col p-3 rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center justify-between p-3 w-full">
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground text-sm">
                                {problem.order_index}
                              </span>
                              <a
                                href={problem.leetcode_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline font-medium flex flex-row gap-2 items-center"
                              >
                                {problem.title}{" "}
                                <ExternalLink className="text-muted-foreground size-4" />
                              </a>
                            </div>
                            <div className="flex flex-row gap-2 items-center">
                              <LogSolveButton
                                problemKey={problem.key}
                                problemTitle={problem.title}
                              />
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
                          {hasProgress && (
                            <div className="flex flex-row gap-2 items-center pl-8">
                              <Progress 
                                className="w-1/6 md:w-1/5" 
                                value={((progress.stage || 0) / 3) * 100}
                              />
                              <p className="text-xs text-muted-foreground">
                                {stageLabels[progress.stage] || `Stage ${progress.stage}`}
                                {daysUntilReview !== null && (
                                  <> • {daysUntilReview > 0 
                                    ? `Due in ${daysUntilReview}d` 
                                    : daysUntilReview === 0 
                                    ? 'Due today' 
                                    : `Overdue by ${Math.abs(daysUntilReview)}d`
                                  }</>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemSetsPage;
