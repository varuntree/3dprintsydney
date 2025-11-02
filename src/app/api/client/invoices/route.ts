import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { listClientInvoices } from "@/server/services/invoices";
import { okAuth, handleErrorAuth } from "@/server/api/respond";
import { BadRequestError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

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

    return okAuth(req, invoices);
  } catch (error) {
    return handleErrorAuth(req, error, 'client.invoices');
  }
}
