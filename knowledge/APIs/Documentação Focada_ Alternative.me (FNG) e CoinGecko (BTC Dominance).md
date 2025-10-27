# Documentação Focada: Alternative.me (FNG) e CoinGecko (BTC Dominance)

Este documento detalha os endpoints para obter o **Fear & Greed Index (FNG)** e a **Dominância do Bitcoin (BTC Dominance)**.

## 1. Alternative.me (Fear & Greed Index)

| Endpoint | Descrição | Parâmetros Chave | Exemplo de Requisição |
| :--- | :--- | :--- | :--- |
| `https://api.alternative.me/fng/` | Retorna o FNG atual ou histórico. | `limit` (int), `format` (json/csv), `date_format` | `https://api.alternative.me/fng/?limit=7&format=json` |
| **Autenticação:** | **Não requer API Key (Pública).** | | |

**Exemplo de Resposta (JSON - Foco em `value` e `value_classification`):**

```json
{
	"data": [
		{
			"value": "40",
			"value_classification": "Fear",
			"timestamp": "1551157200",
			"time_until_update": "68499"
		}
	]
}
```

## 2. CoinGecko (BTC Dominance e Market Cap)

A CoinGecko fornece dados globais de mercado. O plano gratuito (Demo API) é usado aqui [2].

*   **Endpoint Base (Demo):** `https://api.coingecko.com/api/v3/`
*   **Autenticação:** Requer `x-cg-demo-api-key` no Header ou Query String.

| Endpoint | Descrição | Parâmetros Chave | Exemplo de Requisição |
| :--- | :--- | :--- | :--- |
| `/global` | Retorna dados agregados do mercado global de criptomoedas. | Nenhum | `https://api.coingecko.com/api/v3/global?x_cg_demo_api_key=YOUR_KEY` |

**Exemplo de Resposta (JSON - Foco em Dominância e Market Cap):**

```json
{
  "data": {
    "total_market_cap": {
      "usd": 2721226850772.63
      // ... outras moedas
    },
    "market_cap_percentage": {
      "btc": 50.4465263233584, // <-- BTC Dominance
      "eth": 14.9228066918211,
      // ... outras moedas
    },
    // ... outros campos
  }
}
```

***

### Referências

[1] Alternative.me. *Fear and Greed Index API*. URL: [https://alternative.me/crypto/fear-and-greed-index/#api](https://alternative.me/crypto/fear-and-greed-index/#api)
[2] CoinGecko. *CoinGecko API Documentation (Demo)*. URL: [https://docs.coingecko.com/](https://docs.coingecko.com/)

