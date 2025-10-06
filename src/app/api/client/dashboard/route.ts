import { NextRequest, NextResponse } from "next/server";
import { requireClientWithIdAPI } from "@/server/auth/api-helpers";
import { prisma } from "@/server/db/client";

export async function GET(req: NextRequest) {
  try {
    const user = await requireClientWithIdAPI(req);

    // Fetch invoice statistics for the client
    const [totalOrders, pendingOrders, paidOrders, totalSpent] = await Promise.all([
      // Total number of invoices
      prisma.invoice.count({
        where: { clientId: user.clientId },
      }),

      // Count of pending invoices
      prisma.invoice.count({
        where: {
          clientId: user.clientId,
          status: "PENDING",
        },
      }),

      // Count of paid invoices
      prisma.invoice.count({
        where: {
          clientId: user.clientId,
          status: "PAID",
        },
      }),

      // Total amount spent (sum of all paid invoices)
      prisma.invoice.aggregate({
        where: {
          clientId: user.clientId,
          status: "PAID",
        },
        _sum: {
          total: true,
        },
      }),
    ]);

    return NextResponse.json({
      data: {
        totalOrders,
        pendingCount: pendingOrders,
        paidCount: paidOrders,
        totalSpent: totalSpent._sum.total ?? 0,
      },
    });
  } catch (error) {
    const e = error as Error & { status?: number };
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch dashboard stats" },
      { status: e?.status ?? 400 }
    );
  }
}
