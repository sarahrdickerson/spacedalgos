/**
 * Creates a mock Supabase client that returns pre-configured responses in order.
 * Each call to .from() consumes one response from the queue.
 * Supports both terminal methods (.maybeSingle(), .single(), .upsert()) and
 * direct await (thenable builders).
 */
export function createMockSupabase(
  responses: Array<{ data?: any; error?: any }>,
) {
  let callIndex = 0;

  const makeBuilder = () => {
    const idx = callIndex++;
    const r = responses[idx] ?? { data: null, error: null };
    const response = { data: r.data ?? null, error: r.error ?? null };
    const p = Promise.resolve(response);

    const builder: any = {
      select: () => builder,
      eq: () => builder,
      neq: () => builder,
      in: () => builder,
      not: () => builder,
      gt: () => builder,
      gte: () => builder,
      lt: () => builder,
      lte: () => builder,
      limit: () => builder,
      order: () => builder,
      maybeSingle: () => p,
      single: () => p,
      upsert: (_data?: any, _opts?: any) => p,
      update: (_data?: any) => builder,
      // Thenable for direct await
      then: p.then.bind(p),
      catch: p.catch.bind(p),
      finally: p.finally.bind(p),
    };
    return builder;
  };

  return {
    from: (_table: string) => makeBuilder(),
    /** How many from() calls have been made — useful for assertions */
    get callCount() {
      return callIndex;
    },
  };
}

/** Shorthand for a successful response */
export const ok = (data: any) => ({ data, error: null });
/** Shorthand for an error response */
export const err = (msg: string) => ({ data: null, error: { message: msg } });
