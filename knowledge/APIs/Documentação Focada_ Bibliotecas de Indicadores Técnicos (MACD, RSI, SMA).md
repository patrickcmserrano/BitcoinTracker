# Documentação Focada: Bibliotecas de Indicadores Técnicos (MACD, RSI, SMA)

Este documento detalha o uso das funções de indicadores chave (**MACD**, **RSI**, **SMA**) nas bibliotecas `technicalindicators` (JS/TS) e `tulind` (Node.js), com foco em parâmetros e formato de saída.

## 1. technicalindicators (TypeScript/JavaScript)

A biblioteca utiliza o método estático `.calculate()` para todos os indicadores [1].

### 1.1. MACD (Moving Average Convergence/Divergence)

| Parâmetro | Tipo | Descrição |
| :--- | :--- | :--- |
| `values` | `number[]` | Array de preços de fechamento. |
| `fastPeriod` | `number` | Período da EMA rápida (padrão: 12). |
| `slowPeriod` | `number` | Período da EMA lenta (padrão: 26). |
| `signalPeriod` | `number` | Período da EMA do sinal (padrão: 9). |

**Exemplo de Uso e Saída:**

```javascript
import { MACD } from 'technicalindicators';

const input = { values: [/* ... */], fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };
const result = MACD.calculate(input);

/* Saída (Array de Objetos): */
[
  { MACD: 0.123, Signal: 0.150, Histogram: -0.027 },
  // ...
]
```

### 1.2. RSI (Relative Strength Index)

| Parâmetro | Tipo | Descrição |
| :--- | :--- | :--- |
| `values` | `number[]` | Array de preços de fechamento. |
| `period` | `number` | Período do RSI (padrão: 14). |

**Exemplo de Uso e Saída:**

```javascript
import { RSI } from 'technicalindicators';

const input = { values: [/* ... */], period: 14 };
const result = RSI.calculate(input);

/* Saída (Array de Números): */
[ 50.12, 55.45, 60.01, /* ... */ ]
```

### 1.3. SMA (Simple Moving Average)

| Parâmetro | Tipo | Descrição |
| :--- | :--- | :--- |
| `values` | `number[]` | Array de preços de fechamento. |
| `period` | `number` | Período da Média Móvel. |

**Exemplo de Uso e Saída:**

```javascript
import { SMA } from 'technicalindicators';

const input = { values: [/* ... */], period: 20 };
const result = SMA.calculate(input);

/* Saída (Array de Números): */
[ 10.50, 10.55, 10.60, /* ... */ ]
```

## 2. Tulip Indicators (tulind - Node.js Wrapper)

O `tulind` usa o método `.indicator()` com arrays de entrada e arrays de opções [2].

### 2.1. MACD (Moving Average Convergence/Divergence)

| Parâmetro | Tipo | Descrição |
| :--- | :--- | :--- |
| `inputs` | `number[][]` | `[[preços de fechamento]]` (Um array de array). |
| `options` | `number[]` | `[fastPeriod, slowPeriod, signalPeriod]` (e.g., `[12, 26, 9]`). |

**Exemplo de Uso e Saída (Promise):**

```javascript
const tulind = require('tulind');
const closes = [/* ... */];

tulind.indicators.macd.indicator([closes], [12, 26, 9]).then(results => {
  /* Saída (Array de Arrays): */
  const macd = results[0];
  const macdSignal = results[1];
  const macdHist = results[2];
});
```

### 2.2. RSI (Relative Strength Index)

| Parâmetro | Tipo | Descrição |
| :--- | :--- | :--- |
| `inputs` | `number[][]` | `[[preços de fechamento]]` (Um array de array). |
| `options` | `number[]` | `[periodo]` (e.g., `[14]`). |

**Exemplo de Uso e Saída (Promise):**

```javascript
tulind.indicators.rsi.indicator([closes], [14]).then(results => {
  const rsiValues = results[0];
});
```

### 2.3. SMA (Simple Moving Average)

| Parâmetro | Tipo | Descrição |
| :--- | :--- | :--- |
| `inputs` | `number[][]` | `[[preços de fechamento]]` (Um array de array). |
| `options` | `number[]` | `[periodo]` (e.g., `[20]`). |

**Exemplo de Uso e Saída (Promise):**

```javascript
tulind.indicators.sma.indicator([closes], [20]).then(results => {
  const smaValues = results[0];
});
```

***

### Referências

[1] anandanand84. *technicalindicators*. GitHub. URL: [https://github.com/anandanand84/technicalindicators](https://github.com/anandanand84/technicalindicators)
[2] TulipCharts. *Tulip Indicators (Indicator List)*. URL: [https://tulipindicators.org/list](https://tulipindicators.org/list)

