import type { PriceDataPort, PriceData, HistoricalData, ProviderError } from '../domain/interfaces';

/**
 * Base provider class implementing common functionality for all price data providers
 * Uses Template Method pattern to define the algorithm structure while allowing
 * subclasses to override specific steps
 */
export abstract class BaseProvider implements PriceDataPort {
  protected websocket: WebSocket | null = null;
  protected subscribers: Map<string, Set<(data: PriceData) => void>> = new Map();
  protected reconnectAttempts = 0;
  protected readonly maxReconnectAttempts = 5;
  protected readonly reconnectDelay = 3000;
  protected isConnecting = false;

  // Abstract methods that subclasses must implement
  abstract getName(): string;
  abstract getPriority(): number;
  abstract getCurrentPrice(symbol: string): Promise<PriceData>;
  abstract getHistoricalData(symbol: string, interval: string, limit?: number): Promise<HistoricalData>;
  abstract healthCheck(): Promise<boolean>;

  // WebSocket related abstract methods
  protected abstract getWebSocketUrl(symbol: string): string;
  protected abstract parseWebSocketMessage(message: any): PriceData | null;
  protected abstract buildSubscribeMessage?(symbol: string): any;

  /**
   * Subscribe to real-time price updates for a symbol
   */
  subscribeToRealTime(symbol: string, callback: (data: PriceData) => void): void {
    // Add callback to subscribers
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
      this.connectWebSocket(symbol);
    }
    this.subscribers.get(symbol)!.add(callback);

    console.log(`${this.getName()}: Subscribed to real-time updates for ${symbol}`);
  }

  /**
   * Unsubscribe from real-time price updates for a symbol
   */
  unsubscribeFromRealTime(symbol: string): void {
    const symbolSubscribers = this.subscribers.get(symbol);
    if (symbolSubscribers && symbolSubscribers.size > 0) {
      this.subscribers.delete(symbol);
      this.disconnectWebSocket(symbol);
      console.log(`${this.getName()}: Unsubscribed from real-time updates for ${symbol}`);
    }
  }

  /**
   * Connect to WebSocket for real-time data
   */
  protected connectWebSocket(symbol: string): void {
    if (this.isConnecting || this.websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;

    try {
      const url = this.getWebSocketUrl(symbol);
      console.log(`${this.getName()}: Connecting to WebSocket for ${symbol}: ${url}`);
      
      this.websocket = new WebSocket(url);

      this.websocket.onopen = () => {
        console.log(`${this.getName()}: WebSocket connected for ${symbol}`);
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Send subscription message if provider supports it
        if (this.buildSubscribeMessage) {
          const subscribeMsg = this.buildSubscribeMessage(symbol);
          if (subscribeMsg) {
            this.websocket?.send(JSON.stringify(subscribeMsg));
          }
        }
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = this.parseWebSocketMessage(JSON.parse(event.data));
          if (data) {
            this.notifySubscribers(symbol, data);
          }
        } catch (error) {
          console.warn(`${this.getName()}: Error parsing WebSocket message:`, error);
        }
      };

      this.websocket.onclose = (event) => {
        console.log(`${this.getName()}: WebSocket disconnected for ${symbol}`, event.code, event.reason);
        this.isConnecting = false;
        this.websocket = null;
        this.handleWebSocketDisconnect(symbol);
      };

      this.websocket.onerror = (error) => {
        console.error(`${this.getName()}: WebSocket error for ${symbol}:`, error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error(`${this.getName()}: Failed to connect WebSocket:`, error);
      this.isConnecting = false;
    }
  }

  /**
   * Handle WebSocket disconnection and implement reconnection logic
   */
  private handleWebSocketDisconnect(symbol: string): void {
    // Only reconnect if we still have subscribers for this symbol
    if (this.subscribers.has(symbol) && this.subscribers.get(symbol)!.size > 0) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        
        console.log(
          `${this.getName()}: Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
        );
        
        setTimeout(() => this.connectWebSocket(symbol), delay);
      } else {
        console.error(`${this.getName()}: Max reconnect attempts reached for ${symbol}`);
        this.notifySubscribersError(symbol, new Error('WebSocket connection failed after maximum retry attempts'));
      }
    }
  }

  /**
   * Disconnect WebSocket for a symbol
   */
  private disconnectWebSocket(symbol: string): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  /**
   * Notify all subscribers of new price data
   */
  private notifySubscribers(symbol: string, data: PriceData): void {
    const callbacks = this.subscribers.get(symbol);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`${this.getName()}: Error in subscriber callback:`, error);
        }
      });
    }
  }

  /**
   * Notify subscribers of errors
   */
  private notifySubscribersError(symbol: string, error: Error): void {
    // For now, just log the error. In the future, we might want to add error callbacks
    console.error(`${this.getName()}: Error for symbol ${symbol}:`, error);
  }

  /**
   * Get the current number of active subscriptions
   */
  getActiveSubscriptions(): number {
    let total = 0;
    this.subscribers.forEach(subscribers => total += subscribers.size);
    return total;
  }

  /**
   * Get subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Check if provider is connected via WebSocket
   */
  isWebSocketConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  /**
   * Cleanup all connections and subscriptions
   */
  destroy(): void {
    console.log(`${this.getName()}: Destroying provider`);
    
    // Close WebSocket connection
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    // Clear all subscriptions
    this.subscribers.clear();
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Utility method to create provider-specific errors
   */
  protected createProviderError(message: string, originalError?: Error): ProviderError {
    return {
      name: 'ProviderError',
      message: `${this.getName()}: ${message}`,
      providerId: this.getName(),
      originalError
    } as ProviderError;
  }

  /**
   * Utility method for making HTTP requests with timeout and error handling
   */
  protected async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const timeoutMs = 10000; // 10 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw this.createProviderError('Request timeout', error);
        }
        throw this.createProviderError(`Request failed: ${error.message}`, error);
      }
      
      throw this.createProviderError('Unknown request error', error as Error);
    }
  }

  /**
   * Utility method to validate symbols
   */
  protected validateSymbol(symbol: string): void {
    if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
      throw new Error('Invalid symbol provided');
    }
  }

  /**
   * Utility method to validate intervals
   */
  protected validateInterval(interval: string): void {
    if (!interval || typeof interval !== 'string') {
      throw new Error('Invalid interval provided');
    }
  }
}
