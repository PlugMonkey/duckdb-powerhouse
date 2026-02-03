import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ConnectionManager, getConnectionManager, resetConnectionManager } from './manager';

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager();
  });

  afterEach(async () => {
    await manager.dispose();
  });

  describe('initial state', () => {
    it('should start disconnected', () => {
      expect(manager.state).toBe('disconnected');
    });

    it('should not be connected initially', () => {
      expect(manager.isConnected).toBe(false);
    });

    it('should have no config initially', () => {
      expect(manager.currentConfig).toBeNull();
    });
  });

  describe('connectInMemory', () => {
    it('should connect to in-memory database', async () => {
      await manager.connectInMemory();
      expect(manager.state).toBe('connected');
      expect(manager.isConnected).toBe(true);
    });

    it('should use default name when not provided', async () => {
      await manager.connectInMemory();
      expect(manager.currentConfig?.name).toBe('In-Memory');
    });

    it('should use custom name when provided', async () => {
      await manager.connectInMemory('Test DB');
      expect(manager.currentConfig?.name).toBe('Test DB');
    });

    it('should set connection type to memory', async () => {
      await manager.connectInMemory();
      expect(manager.currentConfig?.type).toBe('memory');
    });

    it('should not have a path for in-memory connection', async () => {
      await manager.connectInMemory();
      expect(manager.currentConfig?.path).toBeUndefined();
    });
  });

  describe('connectToFile', () => {
    const testDbPath = '/tmp/test-duckdb-powerhouse.duckdb';

    afterEach(async () => {
      // Clean up test file
      try {
        const fs = await import('fs/promises');
        await fs.unlink(testDbPath);
        await fs.unlink(testDbPath + '.wal');
      } catch {
        // File might not exist, ignore
      }
    });

    it('should connect to file database', async () => {
      await manager.connectToFile(testDbPath);
      expect(manager.state).toBe('connected');
      expect(manager.isConnected).toBe(true);
    });

    it('should set connection type to file', async () => {
      await manager.connectToFile(testDbPath);
      expect(manager.currentConfig?.type).toBe('file');
    });

    it('should store the file path', async () => {
      await manager.connectToFile(testDbPath);
      expect(manager.currentConfig?.path).toBe(testDbPath);
    });

    it('should derive name from path when not provided', async () => {
      await manager.connectToFile(testDbPath);
      expect(manager.currentConfig?.name).toBe('test-duckdb-powerhouse.duckdb');
    });

    it('should use custom name when provided', async () => {
      await manager.connectToFile(testDbPath, 'My Database');
      expect(manager.currentConfig?.name).toBe('My Database');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from in-memory database', async () => {
      await manager.connectInMemory();
      await manager.disconnect();
      expect(manager.state).toBe('disconnected');
      expect(manager.isConnected).toBe(false);
    });

    it('should clear config on disconnect', async () => {
      await manager.connectInMemory();
      await manager.disconnect();
      expect(manager.currentConfig).toBeNull();
    });

    it('should be safe to call disconnect when not connected', async () => {
      await expect(manager.disconnect()).resolves.not.toThrow();
    });

    it('should be safe to call disconnect multiple times', async () => {
      await manager.connectInMemory();
      await manager.disconnect();
      await expect(manager.disconnect()).resolves.not.toThrow();
    });
  });

  describe('reconnection', () => {
    it('should disconnect existing connection when connecting again', async () => {
      await manager.connectInMemory('First');
      await manager.connectInMemory('Second');
      expect(manager.currentConfig?.name).toBe('Second');
    });
  });

  describe('getConnection', () => {
    it('should throw when not connected', () => {
      expect(() => manager.getConnection()).toThrow('No active database connection');
    });

    it('should return connection when connected', async () => {
      await manager.connectInMemory();
      expect(() => manager.getConnection()).not.toThrow();
    });
  });

  describe('getDatabase', () => {
    it('should throw when not connected', () => {
      expect(() => manager.getDatabase()).toThrow('No active database');
    });

    it('should return database when connected', async () => {
      await manager.connectInMemory();
      expect(() => manager.getDatabase()).not.toThrow();
    });
  });

  describe('execute', () => {
    beforeEach(async () => {
      await manager.connectInMemory();
    });

    it('should execute simple query', async () => {
      const result = await manager.execute('SELECT 1 as value');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('value', 1);
    });

    it('should execute query with multiple rows', async () => {
      const result = await manager.execute('SELECT * FROM range(5) as t(num)');
      expect(result).toHaveLength(5);
    });

    it('should handle empty result', async () => {
      const result = await manager.execute('SELECT 1 WHERE false');
      expect(result).toHaveLength(0);
    });

    it('should throw on invalid SQL', async () => {
      await expect(manager.execute('INVALID SQL')).rejects.toThrow();
    });

    it('should handle various data types', async () => {
      const result = await manager.execute(`
        SELECT
          42 as int_val,
          3.14 as float_val,
          'hello' as str_val,
          true as bool_val,
          NULL as null_val
      `);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        int_val: 42,
        float_val: 3.14,
        str_val: 'hello',
        bool_val: true,
        null_val: null,
      });
    });
  });

  describe('stream', () => {
    beforeEach(async () => {
      await manager.connectInMemory();
    });

    it('should stream results', async () => {
      const rows: unknown[] = [];
      for await (const row of manager.stream('SELECT * FROM range(3) as t(num)')) {
        rows.push(row);
      }
      expect(rows).toHaveLength(3);
    });

    it('should stream empty result', async () => {
      const rows: unknown[] = [];
      for await (const row of manager.stream('SELECT 1 WHERE false')) {
        rows.push(row);
      }
      expect(rows).toHaveLength(0);
    });
  });

  describe('state change listeners', () => {
    it('should notify listeners on connect', async () => {
      const states: string[] = [];
      manager.onStateChange((state) => states.push(state));

      await manager.connectInMemory();

      expect(states).toContain('connecting');
      expect(states).toContain('connected');
    });

    it('should notify listeners on disconnect', async () => {
      await manager.connectInMemory();

      const states: string[] = [];
      manager.onStateChange((state) => states.push(state));

      await manager.disconnect();

      expect(states).toContain('disconnected');
    });

    it('should allow unsubscribing', async () => {
      const states: string[] = [];
      const unsubscribe = manager.onStateChange((state) => states.push(state));

      unsubscribe();
      await manager.connectInMemory();

      expect(states).toHaveLength(0);
    });

    it('should handle listener errors gracefully', async () => {
      manager.onStateChange(() => {
        throw new Error('Listener error');
      });

      // Should not throw despite listener error
      await expect(manager.connectInMemory()).resolves.not.toThrow();
    });
  });

  describe('getTypeDisplay', () => {
    it('should return "Not connected" when disconnected', () => {
      expect(manager.getTypeDisplay()).toBe('Not connected');
    });

    it('should return "In-Memory" for memory connection', async () => {
      await manager.connectInMemory();
      expect(manager.getTypeDisplay()).toBe('In-Memory');
    });

    it('should return "File" for file connection', async () => {
      await manager.connectToFile('/tmp/test.duckdb');
      expect(manager.getTypeDisplay()).toBe('File');
      // Clean up
      const fs = await import('fs/promises');
      try {
        await fs.unlink('/tmp/test.duckdb');
        await fs.unlink('/tmp/test.duckdb.wal');
      } catch {
        // Ignore
      }
    });
  });

  describe('dispose', () => {
    it('should disconnect on dispose', async () => {
      await manager.connectInMemory();
      await manager.dispose();
      expect(manager.isConnected).toBe(false);
    });

    it('should clear listeners on dispose', async () => {
      const states: string[] = [];
      manager.onStateChange((state) => states.push(state));

      await manager.dispose();
      states.length = 0; // Clear captured states

      // Create new connection shouldn't notify old listeners
      const newManager = new ConnectionManager();
      await newManager.connectInMemory();
      await newManager.dispose();

      expect(states).toHaveLength(0);
    });
  });
});

describe('Singleton functions', () => {
  afterEach(() => {
    resetConnectionManager();
  });

  describe('getConnectionManager', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getConnectionManager();
      const instance2 = getConnectionManager();
      expect(instance1).toBe(instance2);
    });
  });

  describe('resetConnectionManager', () => {
    it('should create new instance after reset', () => {
      const instance1 = getConnectionManager();
      resetConnectionManager();
      const instance2 = getConnectionManager();
      expect(instance1).not.toBe(instance2);
    });
  });
});
