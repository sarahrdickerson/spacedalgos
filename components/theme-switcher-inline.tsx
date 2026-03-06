"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Laptop } from "lucide-react";

export function ThemeSwitcherInline() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-full rounded-md bg-muted animate-pulse" />;

  const options = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Laptop, label: "System" },
  ] as const;

  return (
    <div className="flex w-full rounded-md border overflow-hidden">
      {options.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant={theme === value ? "default" : "ghost"}
          size="sm"
          className="flex-1 rounded-none border-0 gap-1.5 px-3"
          onClick={() => setTheme(value)}
          aria-label={label}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs">{label}</span>
        </Button>
      ))}
    </div>
  );
}
