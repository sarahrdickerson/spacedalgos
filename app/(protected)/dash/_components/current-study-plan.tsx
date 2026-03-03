"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import React from "react";
import { toast } from "sonner";

interface ProblemList {
  id: string;
  key: string;
  name: string;
  source?: string;
  version?: string;
}

const CurrentStudyPlan = () => {
  const [activeList, setActiveList] = React.useState<ProblemList | null>(null);
  const [problemLists, setProblemLists] = React.useState<ProblemList[]>([]);
  const [selectedList, setSelectedList] = React.useState<ProblemList | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [listsLoading, setListsLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch active study plan
        const activeResponse = await fetch("/api/user/active-study-plan");
        if (!activeResponse.ok) {
          throw new Error("Failed to fetch active study plan");
        }
        const activeData = await activeResponse.json();
        setActiveList(activeData.active_list);

        // Fetch problem lists
        setListsLoading(true);
        const listsResponse = await fetch("/api/problems/problemlists");
        if (!listsResponse.ok) {
          throw new Error("Failed to fetch problem lists");
        }
        const listsData = await listsResponse.json();
        setProblemLists(Array.isArray(listsData?.data) ? listsData.data : []);
        setListsLoading(false);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError("Failed to load study plan data");
        setLoading(false);
        setListsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedList) {
      toast.error("Please select a problem list");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/user/active-study-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          list_id: selectedList.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to set active study plan" }));
        throw new Error(errorData.error || "Failed to set active study plan");
      }

      const data = await response.json();
      setActiveList(data.active_list);
      setSelectedList(null);
      toast.success("Active study plan set successfully!");
    } catch (error) {
      console.error("Error setting active study plan:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to set active study plan"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle>Current Study Plan</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle>Current Study Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeList) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle>Current Study Plan</CardTitle>
            <CardDescription>
              You haven't set an active study plan yet. Choose a problem list to
              start practicing.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className="flex flex-row gap-4 items-end w-full justify-between">
                <div className="flex flex-col gap-2 w-full">
                  <Label>Select Problem List</Label>
                  {listsLoading ? (
                    <div className="flex items-center gap-2 p-2">
                      <Spinner className="w-4 h-4" />
                      <span className="text-sm text-muted-foreground">
                        Loading problem lists...
                      </span>
                    </div>
                  ) : (
                    <Combobox
                      items={problemLists}
                      value={selectedList?.name ?? ""}
                      onValueChange={(value) => {
                        const list = problemLists.find(l => l.name === value);
                        setSelectedList(list ?? null);
                      }}
                    >
                      <ComboboxInput placeholder="Select a problem list" />
                      <ComboboxContent>
                        <ComboboxEmpty>No problem lists found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item: ProblemList) => (
                            <ComboboxItem key={item.id} value={item.name}>
                              <div className="flex flex-col">
                                <span className="font-medium">{item.name}</span>
                                {item.source && (
                                  <span className="text-xs text-muted-foreground">
                                    {item.source}
                                  </span>
                                )}
                              </div>
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )}
                </div>
                <Button type="submit" disabled={!selectedList || submitting}>
                {submitting ? "Setting..." : "Set Active Study Plan"}
              </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Current Study Plan</CardTitle>
          <CardDescription>
            Your active study plan for spaced repetition practice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Plan Name</p>
              <p className="font-medium">{activeList.name}</p>
            </div>
            {activeList.source && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="font-medium">{activeList.source}</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline">Change Study Plan</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CurrentStudyPlan;
