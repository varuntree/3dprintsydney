/**
 * API parameter parsing utilities
 *
 * Provides reusable functions for parsing and validating API request parameters.
 */

/**
 * Parse pagination parameters from URL search params
 * @param searchParams - URL search parameters
 * @returns Pagination parameters with defaults
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  limit: number;
  offset: number;
} {
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  return {
    limit: Number.isFinite(limit) && limit > 0 && limit <= 100 ? limit : 20,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
  };
}

/**
 * Parse a numeric ID from a string
 * @param id - String ID to parse
 * @returns Parsed numeric ID
 * @throws Error if ID is not a valid positive integer
 */
export function parseNumericId(id: string): number {
  const parsed = parseInt(id, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ID: ${id}`);
  }

  return parsed;
}

/**
 * Parse comma-separated job IDs from a string
 * @param ids - Comma-separated job IDs
 * @returns Array of parsed job IDs
 * @throws Error if any ID is not a valid positive integer
 */
export function parseJobIds(ids: string): number[] {
  const parts = ids.split(',').map(s => s.trim()).filter(Boolean);

  if (parts.length === 0) {
    throw new Error('No job IDs provided');
  }

  const parsed = parts.map(id => {
    const num = parseInt(id, 10);
    if (!Number.isFinite(num) || num <= 0) {
      throw new Error(`Invalid job ID: ${id}`);
    }
    return num;
  });

  return parsed;
}

/**
 * Calculate date window for date range filtering
 * @param window - Time window identifier (e.g., 'today', '7days', '30days', 'year')
 * @returns Object with start and end dates for the window
 */
export function calculateDateWindow(window: string): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  let startDate: Date;

  switch (window) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;

    case '7days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;

    case '30days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'year':
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;

    default:
      // Default to last 30 days
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
}
