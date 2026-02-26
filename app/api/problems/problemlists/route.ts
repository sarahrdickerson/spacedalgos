import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.from("problem_lists").select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      count: data?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch problem lists" },
      { status: 500 }
    );
  }
}
