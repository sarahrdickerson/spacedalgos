"use client";
import React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ExternalLink } from "lucide-react";
import LogSolveButton from "./_components/log-solve-button";

const ProblemSetsPage = () => {
  const [problemSets, setProblemSets] = React.useState<any>(null);
  const [activeSet, setActiveSet] = React.useState<any>(null);

  React.useEffect(() => {
    // Fetch problem lists from API
    fetch("/api/problems/problemlists")
      .then((response) => response.json())
      .then(({ data }) => {
        let foundKey = data[0]?.key || "blind75"; // default to blind75 if no lists found
        setProblemSets(data);

        // Fetch the first problem list's items to display by default (blind75)
        fetch("/api/problems/problemlist-items?listKey=" + foundKey)
          .then((res) => res.json())
          .then(({ list, items }) => {
            setActiveSet({ list, items });
          });
      });
  }, []);

  // Group problems by category and sort by order_index
  const groupedProblems = React.useMemo(() => {
    if (!activeSet) return {};

    const groups: Record<string, Array<(typeof activeSet.items)[0]>> = {};

    activeSet.items.forEach((item: { problem: { category: any } }) => {
      const category = item.problem.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    // Sort each group by order_index
    Object.keys(groups).forEach((category) => {
      groups[category].sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
      );
    });

    return groups;
  }, [activeSet]);

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      {activeSet && (
        <div className="flex flex-col w-full gap-6">
          <h1 className="text-2xl font-bold">
            {activeSet.list.name ?? activeSet.list.key}
          </h1>
          <div className="flex flex-col gap-4 w-full">
            {Object.entries(groupedProblems).map(([category, problems]) => (
              <Collapsible key={category} className="w-full border rounded-lg">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-lg font-semibold hover:bg-accent transition-colors">
                  <div className="flex items-center gap-2">
                    {category}
                    <Badge variant="secondary">{problems.length}</Badge>
                  </div>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="w-full">
                  <div className="flex flex-col gap-2 w-full p-4 pt-0">
                    {problems.map((item) => (
                      <div
                        key={item.problem.key}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-sm">
                            {item.order_index}
                          </span>
                          <a
                            href={item.problem.leetcode_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline font-medium flex flex-row gap-2 items-center"
                          >
                            {item.problem.title}{" "}
                            <ExternalLink className="text-muted-foreground size-4" />
                          </a>
                        </div>
                        <div className="flex flex-row gap-2 items-center">
                          <LogSolveButton
                            problemKey={item.problem.key}
                            problemTitle={item.problem.title}
                          />
                          <Badge
                            className={
                              item.problem.difficulty === "Easy"
                                ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
                                : item.problem.difficulty === "Medium"
                                ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20"
                                : "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20"
                            }
                          >
                            {item.problem.difficulty}
                          </Badge>
                        </div>
                      </div>
                    ))}
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
