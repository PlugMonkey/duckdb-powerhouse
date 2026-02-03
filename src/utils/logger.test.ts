import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Logger } from './logger';

describe('Logger', () => {
  beforeEach(() => {
    // Reset any state between tests
    vi.clearAllMocks();
  });

  describe('info', () => {
    it('should not throw when logging message', () => {
      expect(() => Logger.info('Test message')).not.toThrow();
    });

    it('should not throw when logging message with data', () => {
      expect(() => Logger.info('Test message', { key: 'value' })).not.toThrow();
    });
  });

  describe('warn', () => {
    it('should not throw when logging warning', () => {
      expect(() => Logger.warn('Warning message')).not.toThrow();
    });

    it('should not throw when logging warning with data', () => {
      expect(() => Logger.warn('Warning message', { error: 'details' })).not.toThrow();
    });
  });

  describe('error', () => {
    it('should not throw when logging error', () => {
      expect(() => Logger.error('Error message')).not.toThrow();
    });

    it('should not throw when logging error with Error object', () => {
      expect(() => Logger.error('Error message', new Error('Test error'))).not.toThrow();
    });

    it('should not throw when logging error with complex data', () => {
      expect(() =>
        Logger.error('Error message', {
          error: new Error('Test'),
          context: { sql: 'SELECT 1' },
        })
      ).not.toThrow();
    });
  });

  describe('debug', () => {
    it('should not throw when logging debug message', () => {
      expect(() => Logger.debug('Debug message')).not.toThrow();
    });

    it('should not throw when logging debug with data', () => {
      expect(() => Logger.debug('Debug message', { detail: 123 })).not.toThrow();
    });
  });

  describe('show', () => {
    it('should not throw when showing output channel', () => {
      expect(() => Logger.show()).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('should not throw when disposing', () => {
      expect(() => Logger.dispose()).not.toThrow();
    });
  });

  describe('circular reference handling', () => {
    it('should handle circular references in data', () => {
      const circular: Record<string, unknown> = { name: 'test' };
      circular['self'] = circular;

      // Should not throw, even with circular reference
      expect(() => Logger.info('Circular test', circular)).not.toThrow();
    });
  });
});
