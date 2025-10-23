"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Conversation } from "@/components/messages/conversation";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/currency";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight, ChevronUp, Receipt, DollarSign, Clock, UploadCloud, ClipboardList, Wallet, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardStats = {
  totalOrders: number;
  pendingCount: number;
  paidCount: number;
  totalSpent: number;
  walletBalance: number;
};

type InvoiceRow = {
  id: number;
  number: string;
  status: string;
  total: number;
  issueDate: string;
  balanceDue: number;
};

type JobRow = {
  id: number;
  title: string;
  status: string;
  priority: string;
  invoiceId: number;
  invoiceNumber: string;
  updatedAt: string;
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
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [messagesExpanded, setMessagesExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifyOnJobStatus, setNotifyOnJobStatus] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [studentDiscount, setStudentDiscount] = useState<{ eligible: boolean; rate: number } | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [statsRes, ordersRes, jobsRes, prefsRes, authRes] = await Promise.all([
        fetch("/api/client/dashboard"),
        fetch("/api/client/invoices?limit=5&offset=0"),
        fetch("/api/client/jobs"),
        fetch("/api/client/preferences"),
        fetch("/api/auth/me"),
      ]);

      if (statsRes.ok) {
        const { data } = await statsRes.json();
        setStats(data);
      }

      if (ordersRes.ok) {
        const { data } = await ordersRes.json();
        setRecentOrders(data);
      }

      if (jobsRes.ok) {
        const { data } = await jobsRes.json();
        setJobs(data);
      }

      if (prefsRes.ok) {
        const { data } = await prefsRes.json();
        setNotifyOnJobStatus(Boolean(data?.notifyOnJobStatus));
      }

      if (authRes.ok) {
        const { data } = await authRes.json();
        if (data) {
          setStudentDiscount({
            eligible: Boolean(data.studentDiscountEligible),
            rate:
              typeof data.studentDiscountRate === "number"
                ? data.studentDiscountRate
                : 0,
          });
        }
      }
    } finally {
      setLoading(false);
      setPrefsLoaded(true);
    }
  }

  // Email notification toggle temporarily disabled while delivery is paused.

  return (
    <div className="space-y-6">
      {/* Welcome Header - Mobile optimized */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">
            Manage your orders and communicate with our team
          </p>
        </div>
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide">Email alerts paused</p>
          <p className="text-[11px] leading-snug">
            We&apos;re tuning the email system this week—SMS and portal messages still work, and we&apos;ll re-enable emails soon.
            {" "}
            {prefsLoaded ? (
              <span className="font-medium">
                Your email preference is safely set to {notifyOnJobStatus ? "on" : "off"}.
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {studentDiscount?.eligible ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
          <GraduationCap className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold">Student pricing active</p>
            <p className="text-xs text-emerald-700/90">
              A {studentDiscount.rate}% discount is automatically applied to every order in this account.
            </p>
          </div>
        </div>
      ) : null}
      </div>

      {/* Quick Order Banner - Mobile optimized: Stack on mobile, horizontal on sm+ */}
      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 shadow-sm shadow-primary/20">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Need something printed fast?</p>
            <p className="text-xs text-primary/80">
              Jump into Quick Order to upload files and lock in pricing in minutes.
            </p>
          </div>
          <Link
            href="/quick-order"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/40 transition hover:bg-primary/90 sm:h-auto sm:w-auto"
          >
            Open Quick Order
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/quick-order" className="block h-full">
          <Card className="h-full gap-4 border-transparent bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition-transform duration-200 hover:-translate-y-1 hover:shadow-primary/60">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-lg font-semibold">Quick Order</CardTitle>
                <p className="text-sm text-primary-foreground/80">
                  Upload STL files and request a quote in minutes.
                </p>
              </div>
              <UploadCloud className="h-6 w-6 text-primary-foreground/85" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm font-medium">
                Start order
                <ChevronRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/client/orders" className="block h-full">
          <Card className="h-full border border-border bg-surface-overlay transition-transform duration-200 hover:-translate-y-1 hover:bg-surface-muted">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-base font-semibold">View All Orders</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Track production status, invoices, and payments.
                </p>
              </div>
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-green-200/50 bg-green-50/30 shadow-sm dark:border-green-900/30 dark:bg-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">
              Available Credit
            </CardTitle>
            <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {loading ? "..." : formatCurrency(stats?.walletBalance ?? 0)}
            </div>
            <p className="mt-1 text-xs text-green-600/80 dark:text-green-400/80">
              Wallet balance
            </p>
          </CardContent>
        </Card>

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

      {/* Active Jobs */}
      <Card className="border border-border bg-surface-overlay">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Current Jobs</CardTitle>
            <Link href="/client/orders">
              <Button variant="ghost" size="sm">
                View Orders
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading jobs...</p>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active jobs at the moment.</p>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/80 p-3 text-sm shadow-sm shadow-black/5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Invoice
                      <Link
                        href={`/client/orders/${job.invoiceId}`}
                        className="ml-1 underline hover:text-primary"
                      >
                        {job.invoiceNumber}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <StatusBadge status={job.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders - Mobile optimized: Card view on mobile, table on sm+ */}
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
            <>
              {/* Mobile: Card View */}
              <div className="space-y-3 sm:hidden">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/client/orders/${order.id}`}
                    className="block rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5 transition hover:bg-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{order.number}</p>
                          <StatusBadge status={order.status} size="sm" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.issueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-medium">{formatCurrency(order.total)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Balance Due</p>
                        <p className="font-semibold text-primary">
                          {formatCurrency(order.balanceDue)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop: Table View */}
              <div className="hidden overflow-x-auto sm:block">
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
            </>
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
    </div>
  );
}
