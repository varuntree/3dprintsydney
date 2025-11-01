"use client";

export type BaseNotification = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  href?: string;
};

export type MessageNotification = BaseNotification & {
  kind: "message";
  senderRole: "ADMIN" | "CLIENT";
  invoiceId?: number | null;
  userId?: number;
  userEmail?: string | null;
  userName?: string | null;
  unseen?: boolean;
};

export type NotificationItem = MessageNotification;

