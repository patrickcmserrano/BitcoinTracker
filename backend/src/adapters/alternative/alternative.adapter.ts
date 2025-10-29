import axios, { AxiosInstance } from 'axios';
import { logger } from '../../config/logger';

const ALTERNATIVE_BASE_URL = 'https://api.alternative.me';

export interface FearGreedResponse {
  name: string;
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
    time_until_update?: string;
  }>;
  metadata: {
    error: string | null;
  };
}

export interface FearGreedData {
  value: number;
  classification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  timestamp: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
}

export class AlternativeAdapter {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: ALTERNATIVE_BASE_URL,
      timeout: 10000,
    });
  }

  /**
   * Get Fear & Greed Index
   */
  async getFearGreedIndex(limit: number = 2): Promise<FearGreedData> {
    try {
      logger.debug('Fetching Fear & Greed Index from Alternative.me');

      const response = await this.client.get<FearGreedResponse>('/fng/', {
        params: { limit }, // Get last 2 days to calculate change
      });

      if (!response.data.data || response.data.data.length === 0) {
        throw new Error('No Fear & Greed data available');
      }

      const latest = response.data.data[0];
      const previous = response.data.data[1];

      const value = parseInt(latest.value);
      const previousValue = previous ? parseInt(previous.value) : value;
      const change = value - previousValue;
      const changePercentage = previousValue !== 0 ? (change / previousValue) * 100 : 0;

      return {
        value,
        classification: this.classifyFearGreed(value),
        timestamp: parseInt(latest.timestamp) * 1000, // Convert to milliseconds
        previousValue,
        change,
        changePercentage,
      };
    } catch (error) {
      logger.error('Error fetching Fear & Greed Index:', error);
      throw error;
    }
  }

  /**
   * Get Fear & Greed Index history
   */
  async getFearGreedHistory(limit: number = 30): Promise<FearGreedData[]> {
    try {
      logger.debug(`Fetching Fear & Greed history (limit: ${limit})`);

      const response = await this.client.get<FearGreedResponse>('/fng/', {
        params: { limit },
      });

      return response.data.data.map((item) => ({
        value: parseInt(item.value),
        classification: this.classifyFearGreed(parseInt(item.value)),
        timestamp: parseInt(item.timestamp) * 1000,
      }));
    } catch (error) {
      logger.error('Error fetching Fear & Greed history:', error);
      throw error;
    }
  }

  /**
   * Classify Fear & Greed value
   */
  private classifyFearGreed(
    value: number
  ): 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed' {
    if (value <= 25) return 'Extreme Fear';
    if (value <= 45) return 'Fear';
    if (value <= 55) return 'Neutral';
    if (value <= 75) return 'Greed';
    return 'Extreme Greed';
  }

  /**
   * Get emoji for classification
   */
  getEmoji(classification: string): string {
    const emojiMap: Record<string, string> = {
      'Extreme Fear': '😱',
      Fear: '😰',
      Neutral: '😐',
      Greed: '🤑',
      'Extreme Greed': '🚀',
    };
    return emojiMap[classification] || '❓';
  }
}

// Export singleton instance
export const alternativeAdapter = new AlternativeAdapter();
