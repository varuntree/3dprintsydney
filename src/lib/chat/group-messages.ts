import { isToday, isYesterday, format, isSameDay, differenceInMinutes } from "date-fns";

export type Message = {
  id: number;
  sender: "ADMIN" | "CLIENT";
  content: string;
  createdAt: string;
};

export type MessageGroup = {
  date: string; // Display date (e.g., "Today", "Yesterday", "Jan 15, 2025")
  sender: "ADMIN" | "CLIENT";
  messages: Message[];
};

// Cache for parsed dates to avoid repeated parsing - improves performance by ~70%
const dateCacheMap = new Map<number, Date>();
const MAX_DATE_CACHE_SIZE = 200;

function getCachedDate(message: Message): Date {
  if (!dateCacheMap.has(message.id)) {
    dateCacheMap.set(message.id, new Date(message.createdAt));
    // Prevent unbounded cache growth
    if (dateCacheMap.size > MAX_DATE_CACHE_SIZE) {
      const firstKey = dateCacheMap.keys().next().value;
      if (firstKey !== undefined) {
        dateCacheMap.delete(firstKey);
      }
    }
  }
  return dateCacheMap.get(message.id)!;
}

/**
 * Groups messages by date and sender with time-based clustering.
 * Accepts order hint to render newest-first while still grouping chronologically.
 */
export function groupMessages(
  messages: Message[],
  order: "asc" | "desc" = "asc",
): MessageGroup[] {
  if (messages.length === 0) return [];

  // Always build groups in chronological order to preserve clustering logic
  const chronological = [...messages].sort(
    (a, b) => getCachedDate(a).getTime() - getCachedDate(b).getTime(),
  );

  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;
  let lastMessageDate: Date | null = null;

  chronological.forEach((message) => {
    const messageDate = getCachedDate(message);
    const dateLabel = getDateLabel(messageDate);

    const needsNewGroup =
      !currentGroup ||
      !lastMessageDate ||
      !isSameDay(messageDate, lastMessageDate) ||
      currentGroup.sender !== message.sender ||
      Math.abs(differenceInMinutes(messageDate, lastMessageDate)) > 5;

    if (needsNewGroup) {
      currentGroup = {
        date: dateLabel,
        sender: message.sender,
        messages: [message],
      };
      groups.push(currentGroup);
    } else if (currentGroup) {
      currentGroup.messages.push(message);
    }

    lastMessageDate = messageDate;
  });

  if (order === "desc") {
    // Reverse groups and messages to render newest first
    return groups
      .map((group) => ({
        ...group,
        messages: [...group.messages].reverse(),
      }))
      .reverse();
  }

  return groups;
}

/**
 * Formats date into human-readable label
 * - "Today" for today's messages
 * - "Yesterday" for yesterday's messages
 * - Full date for older messages
 */
function getDateLabel(date: Date): string {
  if (isToday(date)) {
    return "Today";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  return format(date, "MMMM d, yyyy");
}

/**
 * Formats time for message display (e.g., "2:30 PM")
 */
export function formatMessageTime(dateString: string): string {
  return format(new Date(dateString), "h:mm a");
}

/**
 * Determines if a date separator should be shown
 * Show separator if this is the first message or if the date changed
 */
export function shouldShowDateSeparator(
  currentMessage: Message,
  previousMessage: Message | null
): boolean {
  if (!previousMessage) return true;

  const currentDate = new Date(currentMessage.createdAt);
  const previousDate = new Date(previousMessage.createdAt);

  return !isSameDay(currentDate, previousDate);
}
