export type NotificationType = "MESSAGE" | "JOB_STATUS" | "SYSTEM";

export type NotificationItem = {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  content: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  metadata: Record<string, any> | null;
};
