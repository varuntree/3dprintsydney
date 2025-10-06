"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Conversation } from "@/components/messages/conversation";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/currency";
import { ChevronDown, ChevronUp, Receipt, DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardStats = {
  totalOrders: number;
  pendingCount: number;
  paidCount: number;
  totalSpent: number;
};

type InvoiceRow = {
  id: number;
  number: string;
  status: string;
  total: number;
  issueDate: string;
  balanceDue: number;
};

/**
 * Client Dashboard
 *
 * Provides a comprehensive overview for clients:
 * - Statistics cards (orders, pending, paid, total spent)
 * - Recent orders table (last 5 invoices)
 * - Compact messages (expandable)
 * - Quick actions
 */
export function ClientDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<InvoiceRow[]>([]);
  const [messagesExpanded, setMessagesExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch("/api/client/dashboard"),
        fetch("/api/client/invoices?limit=5&offset=0"),
      ]);

      if (statsRes.ok) {
        const { data } = await statsRes.json();
        setStats(data);
      }

      if (ordersRes.ok) {
        const { data } = await ordersRes.json();
        setRecentOrders(data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
        <p className="text-sm text-muted-foreground">
          Manage your orders and communicate with our team
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border bg-surface-overlay">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.totalOrders ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-surface-overlay">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.pendingCount ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-surface-overlay">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
            <Receipt className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.paidCount ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-surface-overlay">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : formatCurrency(stats?.totalSpent ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="border border-border bg-surface-overlay">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <Link href="/client/orders">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading orders...</p>
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Number</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                    <th className="pb-2 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-2">
                        <Link
                          href={`/client/orders/${order.id}`}
                          className="font-medium underline hover:text-primary"
                        >
                          {order.number}
                        </Link>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(order.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        <StatusBadge status={order.status} size="sm" />
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {formatCurrency(order.balanceDue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages - Compact & Expandable */}
      <Card className="border border-border bg-surface-overlay">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Messages</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Chat with our team about your orders
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessagesExpanded(!messagesExpanded)}
            >
              {messagesExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Expand
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className={messagesExpanded ? "h-[600px]" : "h-[300px]"}>
            <Conversation currentUserRole="CLIENT" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/quick-order" className="block">
          <Card className="h-full border border-border bg-surface-overlay hover:bg-surface-muted transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-base">Quick Order</CardTitle>
              <p className="text-xs text-muted-foreground">
                Upload files and get instant quotes
              </p>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/client/orders" className="block">
          <Card className="h-full border border-border bg-surface-overlay hover:bg-surface-muted transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-base">View All Orders</CardTitle>
              <p className="text-xs text-muted-foreground">
                Track your invoices and payments
              </p>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
