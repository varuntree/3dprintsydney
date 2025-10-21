/**
 * Common/Shared Types
 * Base types used across multiple resources
 */

/**
 * Base pagination options for list operations
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Base sort options for list operations
 * @template T - Union type of sortable field names
 */
export interface SortOptions<T extends string = string> {
  sort?: T;
  order?: 'asc' | 'desc';
}

/**
 * Base search options for list operations
 */
export interface SearchOptions {
  q?: string;
}

/**
 * Standard list response wrapper
 * @template T - Type of items in the list
 */
export interface ListResponse<T> {
  items: T[];
  count?: number;
  hasMore?: boolean;
  nextOffset?: number | null;
}
