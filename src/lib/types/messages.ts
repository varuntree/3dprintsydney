/**
 * Message Types
 * All types related to user messages
 */

/**
 * Message DTO
 * Represents a user message (from client or admin)
 */
export interface MessageDTO {
  id: number;
  userId: number;
  invoiceId: number | null;
  sender: 'ADMIN' | 'CLIENT';
  content: string;
  createdAt: string;
}

/**
 * Message Filters
 * Query parameters for listing messages
 */
export interface MessageFilters {
  invoiceId?: number;
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
}

/**
 * Message Input
 * Data required to create a new message
 */
export interface MessageInput {
  content: string;
  invoiceId?: number | null;
}
