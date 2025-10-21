import { NextRequest } from "next/server";
import { requireUser } from "@/server/auth/session";
import { listClientInvoices } from "@/server/services/invoices";
import { ok, handleError } from "@/server/api/respond";
import { BadRequestError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    if (!user.clientId) {
      throw new BadRequestError("No client associated with user");
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");

    const invoices = await listClientInvoices(user.clientId, {
      limit,
      offset,
    });

    return ok(invoices);
  } catch (error) {
    return handleError(error, 'client.invoices');
  }
}
