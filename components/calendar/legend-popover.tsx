import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { InfoCircledIcon } from "@radix-ui/react-icons";

const LegendPopover = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <InfoCircledIcon className="w-4 h-4" />
          <span>Legend</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Learning Stages</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-gray-500/20 border border-gray-500/30 flex-shrink-0"></div>
                <span className="font-medium">First Attempt</span>
                <span className="text-muted-foreground">(review next day)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-500/30 flex-shrink-0"></div>
                <span className="font-medium">Learning</span>
                <span className="text-muted-foreground">(~1-4 days)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/30 flex-shrink-0"></div>
                <span className="font-medium">Reinforcing</span>
                <span className="text-muted-foreground">(~1-2 weeks)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30 flex-shrink-0"></div>
                <span className="font-medium">Mastered</span>
                <span className="text-muted-foreground">
                  (~monthly/quarterly)
                </span>
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-medium text-sm mb-2">Event Types</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-blue-500/60 border border-blue-500 flex-shrink-0 mt-0.5"></div>
                <div>
                  <div className="font-medium">Due for Review</div>
                  <div className="text-muted-foreground">
                    Brighter - click to log attempt
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-blue-500/10 border border-blue-500/20 opacity-60 flex-shrink-0 mt-0.5"></div>
                <div>
                  <div className="font-medium">Past Attempts</div>
                  <div className="text-muted-foreground">
                    Faded - click to view details
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-red-500/30 border-2 border-double border-red-500/50 flex-shrink-0 mt-0.5"></div>
                <div>
                  <div className="font-medium text-xs mt-0.5">Overdue</div>
                  <div className="text-muted-foreground">
                    Scheduled review was missed - shown on today's date
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <div className="w-4 h-4 rounded border border-dashed border-violet-400/50 bg-violet-500/5 flex-shrink-0 mt-0.5"></div>
                <div>
                  <div className="font-medium">Projected New</div>
                  <div className="text-muted-foreground">
                    Suggested order only - any new problem counts toward your
                    daily quota
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LegendPopover;
