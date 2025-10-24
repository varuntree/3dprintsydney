/**
 * Date separator component for message grouping
 *
 * Displays dates like "Today", "Yesterday", or full date
 * Centered with subtle styling
 */
export function DateHeader({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="rounded-md bg-[var(--color-info-bg)] px-3 py-1 text-xs font-medium text-[var(--color-info-foreground)] shadow-sm">
        {date}
      </div>
    </div>
  );
}
