import { describe, it, expect } from 'vitest';

import { config } from './config';
import { DEFAULTS } from '../constants';

describe('config', () => {
  describe('maxResultRows', () => {
    it('should return default value when not configured', () => {
      expect(config.maxResultRows).toBe(DEFAULTS.MAX_RESULT_ROWS);
    });

    it('should be a positive number', () => {
      expect(config.maxResultRows).toBeGreaterThan(0);
    });
  });

  describe('duckdbPath', () => {
    it('should return undefined when not configured', () => {
      expect(config.duckdbPath).toBeUndefined();
    });
  });

  describe('defaultResultLimit', () => {
    it('should return default value when not configured', () => {
      expect(config.defaultResultLimit).toBe(DEFAULTS.DEFAULT_RESULT_LIMIT);
    });

    it('should be a positive number', () => {
      expect(config.defaultResultLimit).toBeGreaterThan(0);
    });

    it('should be less than or equal to maxResultRows', () => {
      expect(config.defaultResultLimit).toBeLessThanOrEqual(config.maxResultRows);
    });
  });

  describe('autoConnect', () => {
    it('should return false by default', () => {
      expect(config.autoConnect).toBe(false);
    });

    it('should be a boolean', () => {
      expect(typeof config.autoConnect).toBe('boolean');
    });
  });

  describe('showRowNumbers', () => {
    it('should return true by default', () => {
      expect(config.showRowNumbers).toBe(true);
    });

    it('should be a boolean', () => {
      expect(typeof config.showRowNumbers).toBe('boolean');
    });
  });

  describe('confirmLargeResults', () => {
    it('should return true by default', () => {
      expect(config.confirmLargeResults).toBe(true);
    });

    it('should be a boolean', () => {
      expect(typeof config.confirmLargeResults).toBe('boolean');
    });
  });
});
