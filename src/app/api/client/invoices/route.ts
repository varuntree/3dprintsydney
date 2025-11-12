import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { listClientInvoices } from "@/server/services/invoices";
import { okAuth, handleErrorAuth } from "@/server/api/respond";
import { BadRequestError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    if (!user.clientId) {
      throw new BadRequestError("No client associated with user");
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");

    const invoices = await listClientInvoices(user.clientId, {
      limit,
      offset,
    });

    return okAuth(request, invoices);
  } catch (error) {
    return handleErrorAuth(request, error, 'client.invoices');
  }
}
