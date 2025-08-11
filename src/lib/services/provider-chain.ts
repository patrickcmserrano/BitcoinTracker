import type { PriceDataPort, PriceData, HistoricalData } from '../domain/interfaces';

/**
 * Chain of Responsibility Pattern Implementation
 * Handles provider failover by trying providers in sequence until one succeeds
 */

export interface ProviderChainNode {
  provider: PriceDataPort;
  next?: ProviderChainNode;
}

export interface ChainExecutionResult<T> {
  result: T;
  providerId: string;
  attempts: number;
  failedProviders: string[];
  executionTime: number;
}

export interface ChainExecutionOptions {
  maxAttempts?: number;
  skipUnhealthyProviders?: boolean;
  timeout?: number;
}

/**
 * Chain of Responsibility for provider failover
 */
export class ProviderChain {
  private head: ProviderChainNode | null = null;
  private providers: Map<string, PriceDataPort> = new Map();

  /**
   * Add a provider to the end of the chain
   */
  addProvider(provider: PriceDataPort): void {
    const node: ProviderChainNode = { provider };
    
    this.providers.set(provider.getName(), provider);

    if (!this.head) {
      this.head = node;
    } else {
      let current = this.head;
      while (current.next) {
        current = current.next;
      }
      current.next = node;
    }

    console.log(`ProviderChain: Added provider ${provider.getName()} to chain`);
  }

  /**
   * Remove a provider from the chain
   */
  removeProvider(providerId: string): boolean {
    if (!this.head) return false;

    // If head needs to be removed
    if (this.head.provider.getName() === providerId) {
      this.head = this.head.next || null;
      this.providers.delete(providerId);
      console.log(`ProviderChain: Removed provider ${providerId} from chain head`);
      return true;
    }

    // Find and remove from middle/end
    let current = this.head;
    while (current.next) {
      if (current.next.provider.getName() === providerId) {
        current.next = current.next.next;
        this.providers.delete(providerId);
        console.log(`ProviderChain: Removed provider ${providerId} from chain`);
        return true;
      }
      current = current.next;
    }

    return false;
  }

  /**
   * Execute getCurrentPrice through the chain
   */
  async getCurrentPrice(
    symbol: string, 
    options: ChainExecutionOptions = {}
  ): Promise<ChainExecutionResult<PriceData>> {
    return this.executeChain(
      (provider) => provider.getCurrentPrice(symbol),
      'getCurrentPrice',
      options
    );
  }

  /**
   * Execute getHistoricalData through the chain
   */
  async getHistoricalData(
    symbol: string,
    interval: string,
    limit?: number,
    options: ChainExecutionOptions = {}
  ): Promise<ChainExecutionResult<HistoricalData>> {
    return this.executeChain(
      (provider) => provider.getHistoricalData(symbol, interval, limit),
      'getHistoricalData',
      options
    );
  }

  /**
   * Execute a function through the provider chain
   */
  private async executeChain<T>(
    operation: (provider: PriceDataPort) => Promise<T>,
    operationName: string,
    options: ChainExecutionOptions = {}
  ): Promise<ChainExecutionResult<T>> {
    const startTime = Date.now();
    const maxAttempts = options.maxAttempts || this.getProviderCount();
    const failedProviders: string[] = [];
    let attempts = 0;

    if (!this.head) {
      throw new Error('ProviderChain: No providers available in chain');
    }

    let current: ProviderChainNode | null = this.head;

    while (current && attempts < maxAttempts) {
      const provider = current.provider;
      const providerId = provider.getName();

      try {
        // Skip unhealthy providers if option is set
        if (options.skipUnhealthyProviders) {
          const isHealthy = await this.checkProviderHealth(provider, options.timeout);
          if (!isHealthy) {
            console.log(`ProviderChain: Skipping unhealthy provider ${providerId}`);
            failedProviders.push(providerId);
            current = current.next;
            continue;
          }
        }

        attempts++;
        console.log(`ProviderChain: Attempting ${operationName} with ${providerId} (attempt ${attempts})`);
        
        const result = await this.executeWithTimeout(
          () => operation(provider),
          options.timeout || 10000
        );

        const executionTime = Math.max(1, Date.now() - startTime);
        
        console.log(`ProviderChain: ${operationName} succeeded with ${providerId} in ${executionTime}ms`);
        
        return {
          result,
          providerId,
          attempts,
          failedProviders,
          executionTime
        };

      } catch (error) {
        console.error(`ProviderChain: ${operationName} failed with ${providerId}:`, error);
        failedProviders.push(providerId);
        current = current.next;
      }
    }

    const executionTime = Date.now() - startTime;
    throw new Error(
      `ProviderChain: All providers failed for ${operationName}. ` +
      `Attempted: ${attempts}, Failed providers: ${failedProviders.join(', ')}, ` +
      `Execution time: ${executionTime}ms`
    );
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  }

  /**
   * Check provider health with timeout
   */
  private async checkProviderHealth(provider: PriceDataPort, timeoutMs = 5000): Promise<boolean> {
    try {
      return await this.executeWithTimeout(
        () => provider.healthCheck(),
        timeoutMs
      );
    } catch (error) {
      console.error(`ProviderChain: Health check failed for ${provider.getName()}:`, error);
      return false;
    }
  }

  /**
   * Get all providers in chain order
   */
  getProviders(): PriceDataPort[] {
    const providers: PriceDataPort[] = [];
    let current = this.head;
    
    while (current) {
      providers.push(current.provider);
      current = current.next;
    }
    
    return providers;
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): PriceDataPort | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get number of providers in chain
   */
  getProviderCount(): number {
    return this.providers.size;
  }

  /**
   * Check if chain has any providers
   */
  isEmpty(): boolean {
    return this.head === null;
  }

  /**
   * Clear all providers from chain
   */
  clear(): void {
    this.head = null;
    this.providers.clear();
    console.log('ProviderChain: All providers cleared from chain');
  }

  /**
   * Reorder providers by priority
   */
  reorderByPriority(): void {
    const providers = this.getProviders();
    providers.sort((a, b) => a.getPriority() - b.getPriority());
    
    this.clear();
    providers.forEach(provider => this.addProvider(provider));
    
    console.log(`ProviderChain: Reordered ${providers.length} providers by priority`);
  }

  /**
   * Get chain status information
   */
  async getChainStatus(timeout = 5000): Promise<Array<{
    providerId: string;
    priority: number;
    isHealthy: boolean;
    responseTime?: number;
    position: number;
  }>> {
    const providers = this.getProviders();
    const statusChecks = providers.map(async (provider, index) => {
      const startTime = Date.now();
      let isHealthy = false;
      let responseTime: number | undefined;

      try {
        isHealthy = await this.checkProviderHealth(provider, timeout);
        if (isHealthy) {
          responseTime = Date.now() - startTime;
        }
      } catch (error) {
        // Health check failed, isHealthy remains false, responseTime remains undefined
      }

      return {
        providerId: provider.getName(),
        priority: provider.getPriority(),
        isHealthy,
        responseTime,
        position: index + 1
      };
    });

    return Promise.all(statusChecks);
  }
}
