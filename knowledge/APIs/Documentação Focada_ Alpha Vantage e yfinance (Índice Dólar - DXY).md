# Documentação Focada: Alpha Vantage e yfinance (Índice Dólar - DXY)

Este documento detalha as duas abordagens para obter dados do **Índice Dólar (DXY)**, um indicador macroeconômico chave.

## 1. Alpha Vantage (DXY via Forex)

A Alpha Vantage não possui um endpoint direto para o DXY, mas o índice pode ser aproximado usando os dados de Forex (FX) [1].

*   **Autenticação:** **Requer API Key** (gratuita).
*   **Endpoint Base:** `https://www.alphavantage.co/query?`

| Função | Descrição | Parâmetros Chave | Exemplo de Uso |
| :--- | :--- | :--- | :--- |
| `FX_DAILY` | Séries temporais diárias (OHLC) de um par de moedas. | `from_symbol`, `to_symbol`, `outputsize`, `apikey` | `...function=FX_DAILY&from_symbol=USD&to_symbol=EUR&apikey=YOUR_KEY` |

**Formato de Resposta (JSON - Exemplo de FX_DAILY):**

```json
{
  "Meta Data": {
    "1. From Symbol": "USD",
    "2. To Symbol": "EUR",
    // ...
  },
  "Time Series FX (Daily)": {
    "2025-10-25": {
      "1. open": "0.9123",
      "2. high": "0.9150",
      "3. low": "0.9100",
      "4. close": "0.9145"
    },
    // ...
  }
}
```

## 2. Yahoo Finance API (yfinance)

O wrapper Python `yfinance` é a maneira mais simples de obter dados históricos do DXY, usando seu símbolo no Yahoo Finance [2].

*   **Autenticação:** **Não requer API Key** (Wrapper não oficial).
*   **Símbolo do DXY:** `DX-Y.NYB` ou `^NYICDX`

**Uso (Python):**

```python
import yfinance as yf

# 1. Obter o objeto Ticker
dxy_ticker = yf.Ticker("DX-Y.NYB")

# 2. Obter dados históricos (OHLCV)
# period='max' para o máximo de dados disponíveis
# interval='1d' para dados diários
hist_data = dxy_ticker.history(period="max", interval="1d")

# 3. Obter o último preço
latest_price = dxy_ticker.info.get('regularMarketPrice')

# hist_data é um DataFrame Pandas com colunas: Open, High, Low, Close, Volume, Dividends, Stock Splits
```

***

### Referências

[1] Alpha Vantage. *API Documentation*. URL: [https://www.alphavantage.co/documentation/](https://www.alphavantage.co/documentation/)
[2] ranaroussi. *yfinance: Download market data from Yahoo! Finance's API*. GitHub. URL: [https://github.com/ranaroussi/yfinance](https://github.com/ranaroussi/yfinance)

