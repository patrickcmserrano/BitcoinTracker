import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker, CircuitState, type CircuitBreakerConfig } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let config: CircuitBreakerConfig;
  let mockFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    config = {
      failureThreshold: 3,
      recoveryTimeout: 1000,
      successThreshold: 2,
      monitoringWindow: 5000
    };
    
    circuitBreaker = new CircuitBreaker('test', config);
    mockFn = vi.fn();
  });

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.isAvailable()).toBe(true);
    });

    it('should have zero stats initially', () => {
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalFailures).toBe(0);
      expect(stats.totalSuccesses).toBe(0);
      expect(stats.uptime).toBe(100);
    });
  });

  describe('Success Handling', () => {
    it('should record successful executions', async () => {
      mockFn.mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledOnce();
      
      const stats = circuitBreaker.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalSuccesses).toBe(1);
      expect(stats.totalFailures).toBe(0);
      expect(stats.uptime).toBe(100);
    });

    it('should reset failure count on success in CLOSED state', async () => {
      mockFn.mockRejectedValueOnce(new Error('fail'))
           .mockResolvedValue('success');
      
      // One failure
      try {
        await circuitBreaker.execute(mockFn);
      } catch {}
      
      // One success - should reset failure count
      await circuitBreaker.execute(mockFn);
      
      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(0);
    });
  });

  describe('Failure Handling', () => {
    it('should record failed executions', async () => {
      mockFn.mockRejectedValue(new Error('test error'));
      
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      
      const stats = circuitBreaker.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalFailures).toBe(1);
      expect(stats.totalSuccesses).toBe(0);
      expect(stats.uptime).toBe(0);
    });

    it('should increment failure count', async () => {
      mockFn.mockRejectedValue(new Error('test error'));
      
      try {
        await circuitBreaker.execute(mockFn);
      } catch {}
      
      try {
        await circuitBreaker.execute(mockFn);
      } catch {}
      
      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(2);
    });
  });

  describe('Circuit Opening', () => {
    it('should open circuit after failure threshold', async () => {
      mockFn.mockRejectedValue(new Error('test error'));
      
      // Cause failures up to threshold
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch {}
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.isAvailable()).toBe(false);
    });

    it('should fail fast when circuit is open', async () => {
      mockFn.mockRejectedValue(new Error('test error'));
      
      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch {}
      }
      
      // Reset mock to return success
      mockFn.mockResolvedValue('success');
      
      // Should fail fast without calling function
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Circuit is OPEN');
      expect(mockFn).toHaveBeenCalledTimes(config.failureThreshold); // Only called during failures
    });
  });

  describe('Half-Open State', () => {
    it('should move to HALF_OPEN after recovery timeout', async () => {
      mockFn.mockRejectedValue(new Error('test error'));
      
      // Open the circuit
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch {}
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      
      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, config.recoveryTimeout + 10));
      
      // Mock success for recovery
      mockFn.mockResolvedValue('success');
      
      // Should attempt execution and move to HALF_OPEN
      const result = await circuitBreaker.execute(mockFn);
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should close circuit after success threshold in HALF_OPEN', async () => {
      // Open circuit first
      mockFn.mockRejectedValue(new Error('test error'));
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch {}
      }
      
      // Wait and reset to success
      await new Promise(resolve => setTimeout(resolve, config.recoveryTimeout + 10));
      mockFn.mockResolvedValue('success');
      
      // First success moves to HALF_OPEN
      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
      
      // Additional successes should close circuit
      for (let i = 1; i < config.successThreshold; i++) {
        await circuitBreaker.execute(mockFn);
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reopen circuit on failure in HALF_OPEN', async () => {
      // Open circuit
      mockFn.mockRejectedValue(new Error('test error'));
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch {}
      }
      
      // Wait and move to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, config.recoveryTimeout + 10));
      mockFn.mockResolvedValue('success');
      await circuitBreaker.execute(mockFn);
      
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
      
      // Fail in HALF_OPEN
      mockFn.mockRejectedValue(new Error('test error'));
      try {
        await circuitBreaker.execute(mockFn);
      } catch {}
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Monitoring Window', () => {
    it('should remove expired failures from count', async () => {
      const shortWindowConfig = { ...config, monitoringWindow: 100 };
      const shortWindowBreaker = new CircuitBreaker('test-short', shortWindowConfig);
      
      mockFn.mockRejectedValue(new Error('test error'));
      
      // Add some failures
      try {
        await shortWindowBreaker.execute(mockFn);
      } catch {}
      
      try {
        await shortWindowBreaker.execute(mockFn);
      } catch {}
      
      const statsBeforeExpiry = shortWindowBreaker.getStats();
      expect(statsBeforeExpiry.failureCount).toBe(2);
      
      // Wait for monitoring window to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Add another failure to trigger cleanup
      try {
        await shortWindowBreaker.execute(mockFn);
      } catch {}
      
      const statsAfterExpiry = shortWindowBreaker.getStats();
      expect(statsAfterExpiry.failureCount).toBe(1); // Only the recent failure
    });
  });

  describe('Force Operations', () => {
    it('should force circuit open', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      
      circuitBreaker.forceOpen();
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should force circuit closed', async () => {
      // Open circuit first
      mockFn.mockRejectedValue(new Error('test error'));
      for (let i = 0; i < config.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch {}
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      
      circuitBreaker.forceClose();
      
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Statistics', () => {
    it('should calculate uptime correctly', async () => {
      mockFn.mockResolvedValueOnce('success')
           .mockRejectedValueOnce(new Error('fail'))
           .mockResolvedValue('success');
      
      await circuitBreaker.execute(mockFn); // Success
      try {
        await circuitBreaker.execute(mockFn); // Failure
      } catch {}
      await circuitBreaker.execute(mockFn); // Success
      
      const stats = circuitBreaker.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalSuccesses).toBe(2);
      expect(stats.totalFailures).toBe(1);
      expect(stats.uptime).toBeCloseTo(66.67, 1);
    });

    it('should track last success and failure times', async () => {
      const startTime = new Date();
      
      mockFn.mockRejectedValueOnce(new Error('fail'))
           .mockResolvedValue('success');
      
      // Failure
      try {
        await circuitBreaker.execute(mockFn);
      } catch {}
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Success
      await circuitBreaker.execute(mockFn);
      
      const stats = circuitBreaker.getStats();
      expect(stats.lastFailureTime).toBeInstanceOf(Date);
      expect(stats.lastSuccessTime).toBeInstanceOf(Date);
      expect(stats.lastFailureTime!.getTime()).toBeLessThan(stats.lastSuccessTime!.getTime());
      expect(stats.lastSuccessTime!.getTime()).toBeGreaterThan(startTime.getTime());
    });
  });

  describe('Edge Cases', () => {
    it('should handle function that throws synchronously', async () => {
      mockFn.mockImplementation(() => {
        throw new Error('sync error');
      });
      
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('sync error');
      
      const stats = circuitBreaker.getStats();
      expect(stats.totalFailures).toBe(1);
    });

    it('should handle zero failure threshold', async () => {
      const zeroThresholdConfig = { ...config, failureThreshold: 0 };
      const zeroThresholdBreaker = new CircuitBreaker('zero', zeroThresholdConfig);
      
      mockFn.mockRejectedValue(new Error('test error'));
      
      // Circuit should never open with 0 threshold
      try {
        await zeroThresholdBreaker.execute(mockFn);
      } catch {}
      
      expect(zeroThresholdBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });
});
