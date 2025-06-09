import { describe, it, expect, vi } from 'vitest';
import { getAllCryptos, CRYPTO_CONFIGS } from '../lib/crypto-config';

describe('CryptoSelector Component', () => {
  it('should have correct crypto configurations', () => {
    const cryptos = getAllCryptos();
    expect(cryptos).toBeDefined();
    expect(cryptos).toHaveLength(3);
    
    // Bitcoin
    expect(cryptos[0]).toMatchObject({
      id: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      icon: '₿',
      color: '#f7931a'
    });

    // Ethereum
    expect(cryptos[1]).toMatchObject({
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      icon: 'Ξ',
      color: '#627eea'
    });

    // Solana
    expect(cryptos[2]).toMatchObject({
      id: 'solana',
      name: 'Solana',
      symbol: 'SOL',
      icon: '◎',
      color: '#9945ff'
    });
  });

  it('should provide correct Binance symbols for API calls', () => {
    expect(CRYPTO_CONFIGS.bitcoin.binanceSymbol).toBe('BTCUSDT');
    expect(CRYPTO_CONFIGS.ethereum.binanceSymbol).toBe('ETHUSDT');
    expect(CRYPTO_CONFIGS.solana.binanceSymbol).toBe('SOLUSDT');
  });

  it('should provide correct TAAPI symbols for technical indicators', () => {
    expect(CRYPTO_CONFIGS.bitcoin.taapiSymbol).toBe('BTC/USDT');
    expect(CRYPTO_CONFIGS.ethereum.taapiSymbol).toBe('ETH/USDT');
    expect(CRYPTO_CONFIGS.solana.taapiSymbol).toBe('SOL/USDT');
  });
});
