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
};

export type NotificationItem = MessageNotification;

