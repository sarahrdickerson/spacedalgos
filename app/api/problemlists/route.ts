import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("problem_lists")
      .select(
        "id, key, name, source, version, description, problem_list_items(count)",
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const lists = data?.map((list) => ({
      ...list,
      problem_count:
        (list.problem_list_items as { count: number }[])[0]?.count ?? 0,
      problem_list_items: undefined,
    }));

    return NextResponse.json({
      data: lists,
      count: lists?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch problem lists" },
      { status: 500 },
    );
  }
}
