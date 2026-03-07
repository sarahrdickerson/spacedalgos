"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ExitIcon } from "@radix-ui/react-icons";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/continue");
  };

  return (
    <button
      onClick={logout}
      className="flex flex-row items-center gap-2 w-full"
    >
      <ExitIcon /> Logout
    </button>
  );
}
