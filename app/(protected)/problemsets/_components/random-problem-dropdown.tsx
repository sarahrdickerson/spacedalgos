import React from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CircleIcon,
  DotsHorizontalIcon,
  ReloadIcon,
  ShuffleIcon,
} from "@radix-ui/react-icons";

interface RandomProblemDropdownProps {
  onRandomAll: () => void;
  onRandomWeak: () => void;
  onRandomUnattempted: () => void;
}

const RandomProblemDropdown = ({
  onRandomAll,
  onRandomWeak,
  onRandomUnattempted,
}: RandomProblemDropdownProps) => {
  return (
    <ButtonGroup>
      <Button variant="outline" onClick={onRandomAll}>
        <ShuffleIcon />
        Random problem
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="More Options">
            <DotsHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Pick random problem from</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRandomWeak}>
              <ReloadIcon /> Weak problems
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRandomUnattempted}>
              <CircleIcon /> Unattempted problems
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
};

export default RandomProblemDropdown;
