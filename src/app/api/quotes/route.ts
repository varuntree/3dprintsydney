import { ok, fail, handleError } from "@/server/api/respond";
import { createQuote, listQuotes } from "@/server/services/quotes";
import { ZodError } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const status = searchParams.getAll("status");
    const limit = Number(searchParams.get("limit") ?? "0");
    const offset = Number(searchParams.get("offset") ?? "0");
    const sort = (searchParams.get("sort") as "issueDate" | "createdAt" | "number" | null) ?? null;
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? null;
    const quotes = await listQuotes({
      q,
      statuses: status.length ? (status as ("DRAFT"|"PENDING"|"ACCEPTED"|"DECLINED"|"CONVERTED")[]) : undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : undefined,
      sort: sort ?? undefined,
      order: order ?? undefined,
    });
    return ok(quotes);
  } catch (error) {
    return handleError(error, "quotes.list");
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const quote = await createQuote(payload);
    return ok(quote, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid quote payload", 422, {
        issues: error.issues,
      });
    }
    return handleError(error, "quotes.create");
  }
}
