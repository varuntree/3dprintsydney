import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

/**
 * TableSkeleton - Mobile optimized
 * - Shows fewer rows on mobile by default (5 → 3 on small screens)
 * - Reduced padding on mobile: px-3 py-2.5 on mobile, px-4 py-3 on sm+
 * - Responsive grid spacing
 */
export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  // Show fewer rows on mobile for better initial load
  const displayRows = typeof window !== 'undefined' && window.innerWidth < 640 ? Math.min(rows, 3) : rows;

  return (
    <div className="space-y-2">
      {Array.from({ length: displayRows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-2 rounded-lg border border-muted/40 bg-surface-subtle px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 md:grid-cols-[repeat(auto-fit,_minmax(80px,_1fr))]"
        >
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton key={colIndex} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
