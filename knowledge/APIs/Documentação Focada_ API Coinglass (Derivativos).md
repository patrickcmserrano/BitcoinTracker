# Documentação Focada: API Coinglass (Derivativos)

Este documento foca nos endpoints da API Coinglass para extrair dados críticos de derivativos: **Long/Short Ratio (LSR)**, **Open Interest (OI)** e **Liquidações**.

## 1. Autenticação

A API Coinglass **requer autenticação por API Key** [1]. A chave deve ser obtida no painel de usuário e incluída nas requisições.

*   **Endpoint Base:** `https://open-api-v4.coinglass.com`

## 2. Long/Short Ratio (LSR)

O LSR é um indicador de sentimento de mercado.

| Endpoint | Descrição | Parâmetros Chave | Exemplo de Uso |
| :--- | :--- | :--- | :--- |
| `/public/v2/longShortRatio` | Retorna o LSR agregado ou por exchange. | `symbol` (e.g., `BTC`), `timeType` (e.g., `h1`), `limit` | `/public/v2/longShortRatio?symbol=BTC&timeType=h1` |
| **Formato de Resposta (JSON):** | Array de objetos com os campos `t` (timestamp), `l` (long ratio), `s` (short ratio) e `lsr` (long/short ratio). |

## 3. Open Interest (OI)

O OI mede o número total de contratos de derivativos em aberto.

| Endpoint | Descrição | Parâmetros Chave | Exemplo de Uso |
| :--- | :--- | :--- | :--- |
| `/public/v2/openInterest` | Retorna o OI agregado ou por exchange. | `symbol` (e.g., `BTC`), `timeType` (e.g., `h1`), `limit` | `/public/v2/openInterest?symbol=BTC&timeType=h1` |
| **Formato de Resposta (JSON):** | Array de objetos com os campos `t` (timestamp) e `o` (open interest em USD). |

## 4. Liquidações

Dados detalhados sobre as liquidações de posições.

| Endpoint | Descrição | Parâmetros Chave | Exemplo de Uso |
| :--- | :--- | :--- | :--- |
| `/public/v2/liquidation` | Retorna dados de liquidação agregados ou por exchange. | `symbol` (e.g., `BTC`), `timeType` (e.g., `h1`), `limit` | `/public/v2/liquidation?symbol=BTC&timeType=h1` |
| **Formato de Resposta (JSON):** | Array de objetos com os campos `t` (timestamp), `l` (valor total de liquidações long), `s` (valor total de liquidações short), e `v` (valor total de liquidações). |

## 5. Heatmap de Liquidação (Visualização)

A API fornece dados brutos que podem ser usados para construir o Heatmap de Liquidação.

| Endpoint | Descrição | Parâmetros Chave | Notas |
| :--- | :--- | :--- | :--- |
| `/public/v2/liquidationHeatmap` | Retorna dados de liquidações por nível de preço. | `symbol` (e.g., `BTC`), `timeType` (e.g., `h1`), `limit` | Os dados devem ser processados para gerar a visualização de heatmap. |

***

### Referências

[1] Coinglass. *CoinGlass API Documentation*. URL: [https://docs.coinglass.com/](https://docs.coinglass.com/)

