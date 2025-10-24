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
          "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm shadow-black/10 sm:max-w-[72%]",
          isOwn
            ? "rounded-br-md bg-gradient-to-br from-blue-600 via-blue-500 to-sky-500 text-white"
            : "rounded-bl-md border border-border/60 bg-background/95 text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content}
        </p>
        {showTime && (
          <p
            className={cn(
              "mt-2 text-right text-[11px]",
              isOwn ? "text-blue-100/90" : "text-muted-foreground"
            )}
          >
            {formatMessageTime(message.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}
