# Documentação de APIs e Bibliotecas para Análise de Mercado

Este documento detalha as APIs e bibliotecas solicitadas para a coleta e análise de dados de mercado de criptomoedas, derivativos e macroeconomia, essenciais para a construção de um sistema de monitoramento robusto.

## 1. APIs Principais (Dados de Mercado)

| API | URL da Documentação | Dados Principais | Autenticação/Notas |
| :--- | :--- | :--- | :--- |
| **Coinglass** | [https://docs.coinglass.com/](https://docs.coinglass.com/) | LSR (Long/Short Ratio), Open Interest (OI), Liquidações, Heatmap. | **Requer API Key** para acesso. A API fornece dados agregados de futuros e spot de grandes exchanges (Binance, OKX, Bybit, etc.). O endpoint base é `https://open-api-v4.coinglass.com`. |
| **Alternative.me** | [https://alternative.me/crypto/fear-and-greed-index/#api](https://alternative.me/crypto/fear-and-greed-index/#api) | Fear & Greed Index (FNG) de Criptomoedas. | **API Pública**. Endpoint: `https://api.alternative.me/fng/`. Suporta parâmetros `limit` e `format` (JSON ou CSV) para dados históricos. |
| **CoinGecko** | [https://docs.coingecko.com/](https://docs.coingecko.com/) | BTC Dominance, Market Cap, Preços, Rankings. | **Plano Gratuito (Demo API)** disponível com rate limits. O endpoint `/global` fornece `market_cap_percentage` (incluindo BTC Dominance) e `total_market_cap`. A autenticação é via `x-cg-demo-api-key` (Header ou Query String). |
| **Binance (Spot)** | [https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints) | Preços BTC/USDT, OHLCV (K-lines). | **API Pública** para dados de mercado Spot. Endpoints relevantes: `/api/v3/klines` (OHLCV) e `/api/v3/ticker/price` (Preço). |
| **Binance (Futures - LSR)** | [https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Long-Short-Ratio](https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Long-Short-Ratio) | LSR (Long/Short Ratio) de Traders. | **API Pública** para dados de mercado de Futuros. O endpoint específico para o Long/Short Ratio de Contas é fornecido. |

## 2. APIs de Índices e Macroeconomia

| API | URL da Documentação | Dados Principais | Autenticação/Notas |
| :--- | :--- | :--- | :--- |
| **Alpha Vantage** | [https://www.alphavantage.co/documentation/](https://www.alphavantage.co/documentation/) | Preço DXY (Índice Dólar), dados históricos. | **Requer API Key** (gratuita). O DXY é tratado como um par de câmbio (Forex). A função `FX_DAILY` pode ser usada para obter dados diários de pares de moedas. |
| **Yahoo Finance API (yfinance)** | [https://github.com/ranaroussi/yfinance](https://github.com/ranaroussi/yfinance) | Índice DXY, índices tradicionais, Forex. | **Wrapper Python não oficial**. O símbolo para o DXY no Yahoo Finance é comumente **`DX-Y.NYB`** ou **`^NYICDX`**. |
| **Trading Economics** | [https://docs.tradingeconomics.com/economic_calendar/snapshot/](https://docs.tradingeconomics.com/economic_calendar/snapshot/) | Eventos econômicos, indicadores macro (Calendário). | **Requer plano pago** (API Key). O endpoint `/calendar` permite a consulta por país, data e importância, fornecendo dados como `Actual`, `Previous` e `Forecast`. |

## 3. Bibliotecas para Indicadores Técnicos (Node.js/TypeScript)

| Biblioteca | URL da Documentação | Indicadores Suportados | Notas |
| :--- | :--- | :--- | :--- |
| **technicalindicators** | [https://github.com/anandanand84/technicalindicators](https://github.com/anandanand84/technicalindicators) | MACD, Estocástico, RSI, Médias Móveis (SMA, EMA, WMA), Bollinger Bands, ADX, ATR, entre outros (mais de 30). | Biblioteca JavaScript/TypeScript com foco em performance e detecção de padrões de candlestick. Possui funções como `sma()` ou `SMA.calculate()`. |
| **Tulip Indicators (tulind)** | [https://tulipindicators.org/](https://tulipindicators.org/) (Core C Library) | Mais de 100 indicadores (incluindo MACD, RSI, etc.). | Wrapper Node.js (pacote `tulind`) para a biblioteca C de alta performance Tulip Indicators. Ideal para cálculos mais leves e rápidos. |

***

### Referências

[1] Coinglass. *CoinGlass API Documentation*. Acessado em 27 de Outubro de 2025.

[2] Alternative.me. *Fear and Greed Index API*. Acessado em 27 de Outubro de 2025.

[3] CoinGecko. *CoinGecko API Documentation (Demo)*. Acessado em 27 de Outubro de 2025.

[4] Binance. *Binance Spot API Documentation (Market Data endpoints)*. Acessado em 27 de Outubro de 2025.

[5] Binance. *Binance Futures API Documentation (Long/Short Ratio)*. Acessado em 27 de Outubro de 2025.

[6] Alpha Vantage. *API Documentation*. Acessado em 27 de Outubro de 2025.

[7] ranaroussi. *yfinance: Download market data from Yahoo! Finance's API*. GitHub. Acessado em 27 de Outubro de 2025.

[8] Trading Economics. *Trading Economics API Documentation (Economic Calendar)*. Acessado em 27 de Outubro de 2025.

[9] anandanand84. *technicalindicators*. GitHub. Acessado em 27 de Outubro de 2025.

[10] TulipCharts. *Tulip Indicators*. Acessado em 27 de Outubro de 2025.
