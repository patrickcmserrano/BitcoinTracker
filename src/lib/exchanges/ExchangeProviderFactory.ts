import { BinanceProvider } from './BinanceProvider';
import { BitgetProvider } from './BitgetProvider';
import type { IExchangeProvider } from './IExchangeProvider';
import type { ExchangeName } from './types';

export class ExchangeProviderFactory {
    private static instances: Map<ExchangeName, IExchangeProvider> = new Map();

    public static getProvider(name: ExchangeName): IExchangeProvider {
        if (!this.instances.has(name)) {
            switch (name) {
                case 'binance':
                    this.instances.set(name, new BinanceProvider());
                    break;
                case 'bitget':
                    this.instances.set(name, new BitgetProvider());
                    break;
                default:
                    throw new Error(`Unknown exchange: ${name}`);
            }
        }
        return this.instances.get(name)!;
    }
}
