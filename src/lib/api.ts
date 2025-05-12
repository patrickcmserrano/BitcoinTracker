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
  amplitude1h: number;
  highPrice1h: number;
  lowPrice1h: number;
  amplitude4h: number;
  highPrice4h: number;
  lowPrice4h: number;
  amplitude1d: number;
  highPrice1d: number;
  lowPrice1d: number;
  amplitude1w: number;
  highPrice1w: number;
  lowPrice1w: number;
  lastUpdate: Date;
  recentPrices: number[];
}

export const getBitcoinData = async (): Promise<BitcoinData> => {
  try {
    console.log('API: Iniciando busca de dados do Bitcoin...');
    
    // Obter dados de 24 horas
    const ticker24hrResponse = await axios.get<Ticker24hr>(`${BASE_URL}/api/v3/ticker/24hr?symbol=BTCUSDT`);
    const ticker24hr = ticker24hrResponse.data;

    // Obter dados de candlesticks para diferentes intervalos
    const [klines10mResponse, klines1hResponse, klines4hResponse, klines1dResponse, klines1wResponse] = await Promise.all([
      axios.get<any[]>(`${BASE_URL}/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=10`),
      axios.get<any[]>(`${BASE_URL}/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=60`),
      axios.get<any[]>(`${BASE_URL}/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=4`),
      axios.get<any[]>(`${BASE_URL}/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24`),
      axios.get<any[]>(`${BASE_URL}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=7`)
    ]);

    // Mapear os dados dos klines para o formato adequado
    const mapKlines = (data: any[]): Kline[] => data.map(kline => ({
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

    const klines10m = mapKlines(klines10mResponse.data);
    const klines1h = mapKlines(klines1hResponse.data);
    const klines4h = mapKlines(klines4hResponse.data);
    const klines1d = mapKlines(klines1dResponse.data);
    const klines1w = mapKlines(klines1wResponse.data);

    // Extrair dados relevantes
    const price = parseFloat(ticker24hr.lastPrice);
    const volume24h = parseFloat(ticker24hr.quoteVolume);
    const percentChange = parseFloat(ticker24hr.priceChangePercent);
    const volumePerHour = volume24h / 24;

    // Função auxiliar para calcular máximos, mínimos e amplitude
    const calculateAmplitude = (klines: Kline[]) => {
      const high = Math.max(...klines.map(k => parseFloat(k.high)));
      const low = Math.min(...klines.map(k => parseFloat(k.low)));
      return { high, low, amplitude: high - low };
    };

    // Calcular amplitudes para diferentes períodos
    const { high: highPrice10m, low: lowPrice10m, amplitude: amplitude10m } = calculateAmplitude(klines10m);
    const { high: highPrice1h, low: lowPrice1h, amplitude: amplitude1h } = calculateAmplitude(klines1h);
    const { high: highPrice4h, low: lowPrice4h, amplitude: amplitude4h } = calculateAmplitude(klines4h);
    const { high: highPrice1d, low: lowPrice1d, amplitude: amplitude1d } = calculateAmplitude(klines1d);
    const { high: highPrice1w, low: lowPrice1w, amplitude: amplitude1w } = calculateAmplitude(klines1w);    // Armazenar os últimos 10 preços
    const recentPrices = klines10m.map(k => parseFloat(k.close));

    const result = {
      price,
      volume24h,
      percentChange,
      volumePerHour,
      amplitude10m,
      highPrice10m,
      lowPrice10m,
      amplitude1h,
      highPrice1h,
      lowPrice1h,
      amplitude4h,
      highPrice4h,
      lowPrice4h,
      amplitude1d,
      highPrice1d,
      lowPrice1d,
      amplitude1w,
      highPrice1w,
      lowPrice1w,
      lastUpdate: new Date(),
      recentPrices
    };
    
    console.log('API: Dados obtidos com sucesso - Preço atual:', price);
    return result;  } catch (error) {
    console.error('Erro ao obter dados do Bitcoin:', error);
    if (axios.isAxiosError(error)) {
      console.error('Detalhes do erro de rede:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Dados:', error.response.data);
      }
    }
    throw error;
  }
};