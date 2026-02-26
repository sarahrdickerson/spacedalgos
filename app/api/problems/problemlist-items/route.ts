import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/problems/problemlist-items?listKey=<problem_list.key>
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const listKey = url.searchParams.get("listKey")?.trim();

    if (!listKey) {
      return NextResponse.json(
        { error: "Missing required query param: listKey" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch the problem list by key + its list items (and each item's problem)
    const { data, error } = await supabase
      .from("problem_lists")
      .select(
        `
        id,
        key,
        name,
        problem_list_items(
          id,
          order_index,
          created_at,
          problem:problems(
            id,
            key,
            title,
            difficulty,
            category,
            leetcode_slug,
            leetcode_url,
            is_premium
          )
        )
      `
      )
      .eq("key", listKey)
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const items = (data?.problem_list_items ?? []).sort(
      (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );

    return NextResponse.json({
      list: {
        id: data.id,
        key: data.key,
        name: data.name,
      },
      items,
      count: items.length,
    });
  } catch (_err) {
    return NextResponse.json(
      { error: "Failed to fetch problem list items" },
      { status: 500 }
    );
  }
}
