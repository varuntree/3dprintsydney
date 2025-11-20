import { describe, it, expect } from 'vitest';
import { validateOrderFile } from './validators';

describe('validateOrderFile', () => {
  it('should accept valid STL files with standard MIME type', () => {
    expect(() => validateOrderFile({
      name: 'model.stl',
      size: 1000,
      type: 'model/stl'
    })).not.toThrow();
  });

  it('should accept valid STL files with application/sla MIME type', () => {
    expect(() => validateOrderFile({
      name: 'model.stl',
      size: 1000,
      type: 'application/sla'
    })).not.toThrow();
  });

  it('should accept valid STL files with weird Windows MIME type (application/vnd.ms-pki.stl)', () => {
    expect(() => validateOrderFile({
      name: 'model.stl',
      size: 1000,
      type: 'application/vnd.ms-pki.stl'
    })).not.toThrow();
  });

  it('should accept valid STL files with generic MIME type', () => {
    expect(() => validateOrderFile({
      name: 'model.stl',
      size: 1000,
      type: 'application/octet-stream'
    })).not.toThrow();
  });

  it('should accept valid 3MF files', () => {
    expect(() => validateOrderFile({
      name: 'model.3mf',
      size: 1000,
      type: 'model/3mf'
    })).not.toThrow();
  });

  it('should reject files with invalid extensions even if MIME type is generic', () => {
    expect(() => validateOrderFile({
      name: 'document.pdf',
      size: 1000,
      type: 'application/octet-stream'
    })).toThrow('Unsupported file type');
  });

  it('should reject files with invalid MIME types', () => {
    expect(() => validateOrderFile({
      name: 'image.png',
      size: 1000,
      type: 'image/png'
    })).toThrow('Unsupported file type');
  });

  it('should reject files exceeding size limit', () => {
    expect(() => validateOrderFile({
      name: 'huge.stl',
      size: 60 * 1024 * 1024, // 60MB
      type: 'model/stl'
    }, 50)).toThrow('exceeds maximum allowed size');
  });

  // The crucial fix test: trusting extension over MIME type for .stl
  it('should accept .stl file with totally wrong MIME type', () => {
    expect(() => validateOrderFile({
      name: 'weird.stl',
      size: 1000,
      type: 'text/html' // Obviously wrong, but if extension is .stl we trust it per new logic
    })).not.toThrow();
  });
});
