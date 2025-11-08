/**
 * Validation utilities for API routes
 *
 * Provides reusable validation functions for common business rules.
 */

/**
 * Validate password change requirements
 * @param currentPassword - Current password to verify
 * @param newPassword - New password to set
 * @throws Error if passwords don't meet requirements
 */
export function validatePasswordChange(
  currentPassword: string,
  newPassword: string
): void {
  if (!currentPassword || currentPassword.length === 0) {
    throw new Error('Current password is required');
  }

  if (!newPassword || newPassword.length === 0) {
    throw new Error('New password is required');
  }

  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters long');
  }

  if (currentPassword === newPassword) {
    throw new Error('New password must be different from current password');
  }
}

/**
 * Validate file size is within limits
 * @param sizeBytes - File size in bytes
 * @param maxSizeBytes - Maximum allowed size in bytes
 * @throws Error if file size exceeds maximum
 */
export function validateFileSize(
  sizeBytes: number,
  maxSizeBytes: number
): void {
  if (sizeBytes > maxSizeBytes) {
    const maxMB = (maxSizeBytes / 1024 / 1024).toFixed(1);
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(1);
    throw new Error(
      `File size (${sizeMB}MB) exceeds maximum allowed size (${maxMB}MB)`
    );
  }
}

/**
 * Validate file type is in allowed list
 * @param mimeType - File MIME type
 * @param allowedTypes - Array of allowed MIME types
 * @throws Error if file type is not allowed
 */
export function validateFileType(
  mimeType: string,
  allowedTypes: string[]
): void {
  if (!allowedTypes.includes(mimeType)) {
    throw new Error(
      `File type '${mimeType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    );
  }
}

/**
 * Validate attachment file for invoice
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in megabytes (default: 10MB)
 * @param allowedTypes - Optional array of allowed MIME types
 * @throws Error if file validation fails
 */
export function validateInvoiceAttachment(
  file: { size: number; type: string; name: string },
  maxSizeMB: number = 10,
  allowedTypes?: string[]
): void {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Validate size
  validateFileSize(file.size, maxSizeBytes);

  // Validate type
  const defaultAllowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const typesToValidate = allowedTypes ?? defaultAllowedTypes;
  validateFileType(file.type, typesToValidate);
}

/**
 * Validate order file (3D model file)
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in megabytes (default: 100MB)
 * @throws Error if file validation fails
 */
export function validateOrderFile(
  file: { size: number; type: string; name: string },
  maxSizeMB: number = 100
): void {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Validate size
  validateFileSize(file.size, maxSizeBytes);

  // Validate type - 3D model files
  const allowedTypes = [
    'application/sla', // STL
    'model/stl',
    'application/octet-stream', // Generic binary (for STL files)
    'model/3mf', // 3MF
    'application/vnd.ms-package.3dmanufacturing-3dmodel+xml', // 3MF
    'application/vnd.3dcl',
    'model/3dcl',
    'application/x-3dcl',
    'model/3cl',
    'application/vnd.3cl',
  ];

  // Also allow by file extension if MIME type is generic
  if (file.type === 'application/octet-stream') {
    const ext = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = new Set(['stl', '3mf', '3dcl', '3cl', 'cl']);
    if (!ext || !allowedExtensions.has(ext)) {
      throw new Error('File must be a 3D model file (.stl, .3mf, .3dcl)');
    }
  } else {
    validateFileType(file.type, allowedTypes);
  }
}
