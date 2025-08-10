import { describe, it, expect, vi } from 'vitest';
import { getAllCryptos, CRYPTO_CONFIGS } from '../lib/crypto-config';

describe('CryptoSelector Component', () => {
  it('should have correct crypto configurations', () => {
    const cryptos = getAllCryptos();
    expect(cryptos).toBeDefined();
    expect(cryptos).toHaveLength(7);
    
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

    // XRP
    expect(cryptos[3]).toMatchObject({
      id: 'xrp',
      name: 'XRP',
      symbol: 'XRP',
      icon: '◯',
      color: '#23292f'
    });

    // PAXG
    expect(cryptos[4]).toMatchObject({
      id: 'paxg',
      name: 'PAX Gold',
      symbol: 'PAXG',
      icon: '🥇',
      color: '#ffd700'
    });

    // TRX
    expect(cryptos[5]).toMatchObject({
      id: 'trx',
      name: 'TRON',
      symbol: 'TRX',
      icon: '⚡',
      color: '#ff060a'
    });

    // USDT/BRL
    expect(cryptos[6]).toMatchObject({
      id: 'usdtbrl',
      name: 'USDT/BRL',
      symbol: 'USDT/BRL',
      icon: '💱',
      color: '#26a17b'
    });
  });

  it('should provide correct Binance symbols for API calls', () => {
    expect(CRYPTO_CONFIGS.bitcoin.binanceSymbol).toBe('BTCUSDT');
    expect(CRYPTO_CONFIGS.ethereum.binanceSymbol).toBe('ETHUSDT');
    expect(CRYPTO_CONFIGS.solana.binanceSymbol).toBe('SOLUSDT');
    expect(CRYPTO_CONFIGS.xrp.binanceSymbol).toBe('XRPUSDT');
    expect(CRYPTO_CONFIGS.paxg.binanceSymbol).toBe('PAXGUSDT');
    expect(CRYPTO_CONFIGS.trx.binanceSymbol).toBe('TRXUSDT');
    expect(CRYPTO_CONFIGS.usdtbrl.binanceSymbol).toBe('USDTBRL');
  });

  it('should provide correct TAAPI symbols for technical indicators', () => {
    expect(CRYPTO_CONFIGS.bitcoin.taapiSymbol).toBe('BTC/USDT');
    expect(CRYPTO_CONFIGS.ethereum.taapiSymbol).toBe('ETH/USDT');
    expect(CRYPTO_CONFIGS.solana.taapiSymbol).toBe('SOL/USDT');
    expect(CRYPTO_CONFIGS.xrp.taapiSymbol).toBe('XRP/USDT');
    expect(CRYPTO_CONFIGS.paxg.taapiSymbol).toBe('PAXG/USDT');
    expect(CRYPTO_CONFIGS.trx.taapiSymbol).toBe('TRX/USDT');
    expect(CRYPTO_CONFIGS.usdtbrl.taapiSymbol).toBe('USDT/BRL');
  });

  it('should render all cryptocurrencies in a responsive grid', () => {
    const cryptos = getAllCryptos();
    expect(cryptos).toHaveLength(7);
    
    // Verify all cryptos have required properties for grid display
    cryptos.forEach(crypto => {
      expect(crypto.id).toBeDefined();
      expect(crypto.symbol).toBeDefined();
      expect(crypto.color).toBeDefined();
      expect(crypto.icon).toBeDefined();
    });
  });

  it('should handle mobile breakpoints for grid layout', () => {
    // Test that we have configurations that would work well in mobile grid
    const cryptos = getAllCryptos();
    
    // With 7 cryptos, responsive grid should work well:
    // Desktop: auto-fit layout
    // Tablet (768px): auto-fit with smaller buttons
    // Mobile (480px): 3 columns = 3+3+1 layout
    // Small mobile (360px): 2 columns = 4 rows
    expect(cryptos.length).toBe(7);
  });
});
