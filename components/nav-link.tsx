"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  children,
  className,
  variant = "desktop",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: "desktop" | "mobile";
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  if (variant === "mobile") {
    return (
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "w-full px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
          isActive && "bg-accent text-accent-foreground font-medium",
          className
        )}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "text-sm hover:text-foreground transition-colors",
        isActive ? "text-foreground font-semibold" : "text-muted-foreground",
        className
      )}
    >
      {children}
    </Link>
  );
}
