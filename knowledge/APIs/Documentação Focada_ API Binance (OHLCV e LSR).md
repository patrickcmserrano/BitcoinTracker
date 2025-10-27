# Documentação Focada: API Binance (OHLCV e LSR)

Este documento foca na extração de dados de mercado Spot (OHLCV) e no **Long/Short Ratio (LSR)** de Futures, conforme especificado. Ambos são endpoints públicos [3].

## 1. Binance Spot - OHLCV (K-lines)

Endpoint para obter dados de velas (OHLCV) para um par específico (e.g., BTC/USDT).

*   **Endpoint Base:** `https://api.binance.com`
*   **Endpoint:** `/api/v3/klines`

| Parâmetro | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `symbol` | `string` | Par de negociação. | `BTCUSDT` |
| `interval` | `string` | Intervalo da vela. | `1m`, `1h`, `1d` |
| `limit` | `int` | Número de velas (máx. 1000). | `500` |

**Exemplo de Requisição:**

`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=100`

**Formato de Resposta (JSON - Array de Arrays):**

```json
[
  [
    1499040000000, // Open time (timestamp)
    "0.01634790",    // Open
    "0.80000000",    // High
    "0.01575800",    // Low
    "0.01577100",    // Close
    "148976.10700000", // Volume
    1499644799999, // Close time (timestamp)
    "2434.19055334", // Quote asset volume
    308,             // Number of trades
    "1756.87400000", // Taker buy base asset volume
    "28.46694368",   // Taker buy quote asset volume
    "0"              // Ignore
  ]
]
```

## 2. Binance Futures - Long/Short Ratio (LSR)

Endpoint para obter a proporção de posições Long e Short de todos os usuários.

*   **Endpoint Base:** `https://fapi.binance.com`
*   **Endpoint:** `/futures/data/globalLongShortAccountRatio`

| Parâmetro | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `symbol` | `string` | Par de negociação de Futures. | `BTCUSDT` |
| `period` | `string` | Intervalo de agregação. | `5m`, `1h`, `1d` |
| `limit` | `int` | Número de pontos de dados (máx. 500). | `100` |

**Exemplo de Requisição:**

`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1d&limit=30`

**Formato de Resposta (JSON - Foco em `longShortRatio`):**

```json
[
  {
    "symbol": "BTCUSDT",
    "longShortRatio": "1.05", // Proporção Long/Short
    "longAccount": "0.5121", // % de contas Long
    "shortAccount": "0.4879", // % de contas Short
    "timestamp": 1573392000000
  }
]
```

***

### Referências

[1] Binance. *Binance Spot API Documentation (Klines)*. URL: [https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints)
[2] Binance. *Binance Futures API Documentation (Long/Short Ratio)*. URL: [https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Long-Short-Ratio](https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Long-Short-Ratio)
[3] Binance. *API Documentation*. URL: [https://binance-docs.github.io/apidocs/spot/en/](https://binance-docs.github.io/apidocs/spot/en/)

