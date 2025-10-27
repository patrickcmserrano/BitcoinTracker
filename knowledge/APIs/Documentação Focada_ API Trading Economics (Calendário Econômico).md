# Documentação Focada: API Trading Economics (Calendário Econômico)

Este documento detalha o endpoint de **Calendário Econômico** da Trading Economics, focando nos parâmetros de filtro e no formato de resposta [1].

## 1. Autenticação

A API **requer API Key** e o acesso completo está associado a um **plano pago**.

*   **Método de Autenticação:** A chave deve ser incluída na URL da requisição como parâmetro `c`.
*   **Endpoint Base:** `https://api.tradingeconomics.com/`

## 2. Endpoint Principal: Calendário

O endpoint `/calendar` permite a filtragem de eventos econômicos.

| Endpoint | Descrição | Parâmetros Chave |
| :--- | :--- | :--- |
| `/calendar` | Retorna o calendário econômico. | `c` (API Key), `importance`, `country`, `initDate`, `endDate` |

## 3. Filtragem e Parâmetros

A força da API reside na capacidade de filtrar eventos por critérios específicos.

| Parâmetro | Descrição | Valores Possíveis | Exemplo de Uso |
| :--- | :--- | :--- | :--- |
| `importance` | Nível de importância do evento. | `1` (Baixa), `2` (Média), `3` (Alta) | `.../calendar?c={key}&importance=3` |
| `country` | Filtra por um ou mais países. | `united states`, `brazil` (separados por vírgula) | `.../calendar/country/united states,brazil?c={key}` |
| `initDate` / `endDate` | Filtra o calendário por intervalo de tempo. | Formato `YYYY-MM-DD` | `.../calendar/country/All/2025-10-01/2025-10-31?c={key}` |

## 4. Formato de Resposta (JSON)

A resposta é um array de objetos, onde cada objeto representa um evento econômico.

| Campo Chave | Descrição | Exemplo de Valor |
| :--- | :--- | :--- |
| `Date` | Data e hora do evento. | `12/2/2016 1:30:00 PM` |
| `Country` | País do evento. | `United States` |
| `Event` | Nome do indicador. | `Non Farm Payrolls` |
| `Actual` | Valor real divulgado. | `178K` |
| `Previous` | Valor anterior. | `142K` |
| `Forecast` | Previsão do consenso. | `175K` |
| `Importance` | Nível de importância. | `3` |

**Exemplo de Requisição Detalhada (Python):**

```python
import requests
api_key = 'YOUR_API_KEY'
url = f'https://api.tradingeconomics.com/calendar/country/united states/2025-10-01/2025-10-31?c={api_key}&importance=3'
data = requests.get(url).json()
```

***

### Referências

[1] Trading Economics. *Trading Economics API Documentation (Economic Calendar)*. URL: [https://docs.tradingeconomics.com/economic_calendar/snapshot/](https://docs.tradingeconomics.com/economic_calendar/snapshot/)

