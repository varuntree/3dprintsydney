/**
 * Date separator component for message grouping
 *
 * Displays dates like "Today", "Yesterday", or full date
 * Centered with subtle styling
 */
export function DateHeader({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-400">
        {date}
      </div>
    </div>
  );
}
