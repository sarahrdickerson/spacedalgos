import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CurrentStudyPlan = () => {
  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Current Study Plan</CardTitle>
          <CardDescription>
            This is your current study plan. You can edit it by clicking the
            button below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input id="plan-name" placeholder="My Study Plan" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-description">Plan Description</Label>
              <Input
                id="plan-description"
                placeholder="A description of my study plan"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button>Save Changes</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CurrentStudyPlan;
