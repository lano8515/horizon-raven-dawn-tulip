export function isUnauthorized(err: unknown) {
  return err instanceof Error && err.message === "Unauthorized";
}

export async function whenAuthed<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isUnauthorized(err)) return fallback;
    throw err;
  }
}
