import axios from 'axios';

const BASE_URL = 'https://api.binance.com';

interface Ticker24hr {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

interface Kline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
  ignore: string;
}

export interface BitcoinData {
  price: number;
  volume24h: number;
  percentChange: number;
  volumePerHour: number;
  amplitude10m: number;
  highPrice10m: number;
  lowPrice10m: number;
  lastUpdate: Date;
  recentPrices: number[];
}

export const getBitcoinData = async (): Promise<BitcoinData> => {
  try {
    // Obter dados de 24 horas
    const ticker24hrResponse = await axios.get<Ticker24hr>(`${BASE_URL}/api/v3/ticker/24hr?symbol=BTCUSDT`);
    const ticker24hr = ticker24hrResponse.data;

    // Obter dados de candlesticks dos últimos 10 minutos
    const klinesResponse = await axios.get<any[]>(`${BASE_URL}/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=10`);
    const klines = klinesResponse.data.map(kline => ({
      openTime: kline[0],
      open: kline[1],
      high: kline[2],
      low: kline[3],
      close: kline[4],
      volume: kline[5],
      closeTime: kline[6],
      quoteAssetVolume: kline[7],
      numberOfTrades: kline[8],
      takerBuyBaseAssetVolume: kline[9],
      takerBuyQuoteAssetVolume: kline[10],
      ignore: kline[11]
    }));

    // Extrair dados relevantes
    const price = parseFloat(ticker24hr.lastPrice);
    const volume24h = parseFloat(ticker24hr.quoteVolume);
    const percentChange = parseFloat(ticker24hr.priceChangePercent);
    const volumePerHour = volume24h / 24;

    // Calcular amplitude dos últimos 10 minutos
    const highPrice10m = Math.max(...klines.map(k => parseFloat(k.high)));
    const lowPrice10m = Math.min(...klines.map(k => parseFloat(k.low)));
    const amplitude10m = highPrice10m - lowPrice10m;

    // Armazenar os últimos 10 preços
    const recentPrices = klines.map(k => parseFloat(k.close));

    return {
      price,
      volume24h,
      percentChange,
      volumePerHour,
      amplitude10m,
      highPrice10m,
      lowPrice10m,
      lastUpdate: new Date(),
      recentPrices
    };
  } catch (error) {
    console.error('Erro ao obter dados do Bitcoin:', error);
    throw error;
  }
};