import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ listKey: string }> }
) {
  try {
    const supabase = await createClient();

    // 1) Auth
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listKey } = await params;
    let decodedListKey: string;
    try {
      decodedListKey = decodeURIComponent(listKey);
    } catch (err) {
      if (err instanceof URIError) {
        return NextResponse.json(
          { error: "Invalid problem list key" },
          { status: 400 }
        );
      }
      throw err;
    }

    // 2) Get the problem list by key
    const { data: problemList, error: listErr } = await supabase
      .from("problem_lists")
      .select("id, key, name")
      .eq("key", decodedListKey)
      .single();

    if (listErr || !problemList) {
      return NextResponse.json(
        { error: `Problem list not found: ${decodedListKey}` },
        { status: 404 }
      );
    }

    // 3) Get all problem IDs in this list
    const { data: items, error: itemsErr } = await supabase
      .from("problem_list_items")
      .select("problem_id")
      .eq("list_id", problemList.id);

    if (itemsErr) {
      console.error("Error fetching problem items:", itemsErr);
      return NextResponse.json(
        { error: "Failed to fetch problem items" },
        { status: 500 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No problems found in list: ${problemList.name}`,
        deleted: {
          attempts_count: 0,
          progress_count: 0,
        },
      });
    }

    const problemIds = items.map((item) => item.problem_id);

    // 4) Delete all attempts for these problems
    const { error: attemptsErr } = await supabase
      .from("user_problem_attempts")
      .delete()
      .eq("user_id", user.id)
      .in("problem_id", problemIds);

    if (attemptsErr) {
      console.error("Error deleting attempts:", attemptsErr);
      return NextResponse.json(
        { error: "Failed to delete attempts" },
        { status: 500 }
      );
    }

    // 5) Delete all progress for these problems
    const { error: progressErr } = await supabase
      .from("user_problem_progress")
      .delete()
      .eq("user_id", user.id)
      .in("problem_id", problemIds);

    if (progressErr) {
      console.error("Error deleting progress:", progressErr);
      return NextResponse.json(
        { error: "Failed to delete progress" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Progress reset for all problems in: ${problemList.name}`,
      deleted: {
        problem_count: problemIds.length,
        list_name: problemList.name,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Unexpected error resetting progress" },
      { status: 500 }
    );
  }
}
