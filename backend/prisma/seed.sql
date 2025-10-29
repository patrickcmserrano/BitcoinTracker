-- Seed inicial das criptomoedas suportadas
INSERT INTO crypto_configs (id, symbol, name, binance_symbol, taapi_symbol, icon, color, precision, active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'BTC', 'Bitcoin', 'BTCUSDT', 'BTC/USDT', '₿', '#f7931a', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'ETH', 'Ethereum', 'ETHUSDT', 'ETH/USDT', 'Ξ', '#627eea', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'SOL', 'Solana', 'SOLUSDT', 'SOL/USDT', '◎', '#9945ff', 2, true, NOW(), NOW()),
  (gen_random_uuid(), 'XRP', 'XRP', 'XRPUSDT', 'XRP/USDT', '◯', '#23292f', 4, true, NOW(), NOW()),
  (gen_random_uuid(), 'PAXG', 'PAX Gold', 'PAXGUSDT', 'PAXG/USDT', '🥇', '#ffd700', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'TRX', 'TRON', 'TRXUSDT', 'TRX/USDT', '⚡', '#ff060a', 6, true, NOW(), NOW()),
  (gen_random_uuid(), 'USDT/BRL', 'USDT/BRL', 'USDTBRL', 'USDT/BRL', '💱', '#26a17b', 2, true, NOW(), NOW())
ON CONFLICT (symbol) DO NOTHING;
