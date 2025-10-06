import { formatMessageTime } from "@/lib/chat/group-messages";
import { cn } from "@/lib/utils";

export type Message = {
  id: number;
  sender: "ADMIN" | "CLIENT";
  content: string;
  createdAt: string;
};

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean; // Is this message sent by current user?
  showTime?: boolean; // Show timestamp on this message?
}

/**
 * Modern message bubble component
 *
 * Design:
 * - Own messages: right-aligned, colored background
 * - Other messages: left-aligned, gray background
 * - Rounded corners (more rounded on far side)
 * - Small timestamp in corner
 */
export function MessageBubble({ message, isOwn, showTime = true }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "flex w-full",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2 shadow-sm",
          isOwn
            ? "rounded-br-sm bg-blue-600 text-white"
            : "rounded-bl-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
        )}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.content}
        </p>
        {showTime && (
          <p
            className={cn(
              "mt-1 text-right text-xs",
              isOwn ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {formatMessageTime(message.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}
