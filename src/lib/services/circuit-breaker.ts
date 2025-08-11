/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascade failures by monitoring failure rates and opening circuit when threshold exceeded
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  recoveryTimeout: number;       // Time to wait before trying half-open (ms)
  successThreshold: number;      // Number of successes needed to close circuit from half-open
  monitoringWindow: number;      // Time window for failure counting (ms)
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  uptime: number; // Percentage
}

/**
 * Circuit Breaker implementation for provider health management
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private readonly failures: Date[] = [];

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        console.log(`CircuitBreaker[${this.name}]: Moving to HALF_OPEN state`);
      } else {
        throw new Error(`CircuitBreaker[${this.name}]: Circuit is OPEN, failing fast`);
      }
    }

    this.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();
    this.totalSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      console.log(`CircuitBreaker[${this.name}]: Success in HALF_OPEN (${this.successCount}/${this.config.successThreshold})`);
      
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
        console.log(`CircuitBreaker[${this.name}]: Circuit CLOSED after recovery`);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failures.length = 0; // Clear all failures
      this.failureCount = 0;
      this.removeExpiredFailures();
    }
  }

  /**
   * Record a failed operation
   */
  private onFailure(): void {
    this.lastFailureTime = new Date();
    this.totalFailures++;
    this.failures.push(new Date());
    this.removeExpiredFailures();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open immediately opens circuit
      this.state = CircuitState.OPEN;
      this.failureCount = this.getRecentFailureCount();
      this.successCount = 0;
      console.log(`CircuitBreaker[${this.name}]: Circuit OPENED from HALF_OPEN after failure`);
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = this.getRecentFailureCount();
      
      if (this.failureCount >= this.config.failureThreshold && this.config.failureThreshold > 0) {
        this.state = CircuitState.OPEN;
        this.successCount = 0;
        console.log(`CircuitBreaker[${this.name}]: Circuit OPENED after ${this.failureCount} failures`);
      }
    }
  }

  /**
   * Check if we should attempt to reset the circuit breaker
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.recoveryTimeout;
  }

  /**
   * Reset the circuit breaker to closed state
   */
  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Remove expired failures from the monitoring window
   */
  private removeExpiredFailures(): void {
    const cutoffTime = Date.now() - this.config.monitoringWindow;
    while (this.failures.length > 0 && this.failures[0].getTime() < cutoffTime) {
      this.failures.shift();
    }
  }

  /**
   * Get the count of recent failures within the monitoring window
   */
  private getRecentFailureCount(): number {
    this.removeExpiredFailures();
    return this.failures.length;
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const uptime = this.totalRequests > 0 
      ? (this.totalSuccesses / this.totalRequests) * 100 
      : 100;

    return {
      state: this.state,
      failureCount: this.getRecentFailureCount(),
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      uptime: Math.round(uptime * 100) / 100
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is available for requests
   */
  isAvailable(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }
    
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      return true;
    }
    
    return this.state === CircuitState.HALF_OPEN;
  }

  /**
   * Force circuit to open (for testing or manual intervention)
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.lastFailureTime = new Date();
    console.log(`CircuitBreaker[${this.name}]: Forced to OPEN state`);
  }

  /**
   * Force circuit to close (for testing or manual intervention)
   */
  forceClose(): void {
    this.reset();
    console.log(`CircuitBreaker[${this.name}]: Forced to CLOSED state`);
  }
}
