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

/**
 * Groups messages by date and sender with time-based clustering
 *
 * Message grouping features:
 * - Group messages by date (Today, Yesterday, or formatted date)
 * - Within each date, group consecutive messages from same sender
 * - Messages within 5 minutes are clustered together
 */
export function groupMessages(messages: Message[]): MessageGroup[] {
  if (messages.length === 0) return [];

  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;
  let lastMessageDate: Date | null = null;

  messages.forEach((message) => {
    const messageDate = new Date(message.createdAt);
    const dateLabel = getDateLabel(messageDate);

    // Check if we need a new group
    const needsNewGroup =
      !currentGroup ||
      !lastMessageDate ||
      !isSameDay(messageDate, lastMessageDate) ||
      currentGroup.sender !== message.sender ||
      differenceInMinutes(messageDate, lastMessageDate) > 5;

    if (needsNewGroup) {
      // Start a new group
      currentGroup = {
        date: dateLabel,
        sender: message.sender,
        messages: [message],
      };
      groups.push(currentGroup);
    } else if (currentGroup) {
      // Add to current group (null check to satisfy TypeScript)
      currentGroup.messages.push(message);
    }

    lastMessageDate = messageDate;
  });

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
