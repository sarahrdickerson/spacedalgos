"use client";

import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { NavLink } from "@/components/nav-link";
import { useState } from "react";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation menu">
          <HamburgerMenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-5 pt-5 px-5" side="left">
        <SheetTitle className="text-xl font-bold pl-1">
          spaced algos
        </SheetTitle>
        <SheetDescription className="sr-only">
          Navigate between study plans and problem sets
        </SheetDescription>
        <div onClick={() => setOpen(false)} className="w-full flex items-center">
          <NavLink href="/dash" variant="mobile">
            study plans
          </NavLink>
        </div>
        <div onClick={() => setOpen(false)} className="w-full flex items-center">
          <NavLink href="/problemsets" variant="mobile">
            problem sets
          </NavLink>
        </div>
      </SheetContent>
    </Sheet>
  );
}
