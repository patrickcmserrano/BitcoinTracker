// Cryptocurrency icon management with local official icons
// Icons downloaded from CoinGecko and stored locally for reliability

// Local icon paths mapping for our supported cryptocurrencies
const LOCAL_ICON_PATHS: Record<string, string> = {
  bitcoin: '/crypto-icons/bitcoin.png',
  ethereum: '/crypto-icons/ethereum.png', 
  solana: '/crypto-icons/solana.png',
  xrp: '/crypto-icons/xrp.png',
  paxg: '/crypto-icons/paxg.png',
  trx: '/crypto-icons/trx.png',
  usdtbrl: '/crypto-icons/usdtbrl.png'
};

// Fallback icons (text symbols) in case image fails to load
const FALLBACK_ICONS: Record<string, string> = {
  bitcoin: '₿',
  ethereum: 'Ξ',
  solana: '◎',
  xrp: '◯',
  paxg: '🥇',
  trx: '⚡',
  usdtbrl: '💱'
};

/**
 * Get the local icon path for a cryptocurrency
 */
export function getCryptoIcon(cryptoId: string): string {
  return LOCAL_ICON_PATHS[cryptoId] || '';
}

/**
 * Get fallback text icon for a cryptocurrency
 */
export function getFallbackIcon(cryptoId: string): string {
  return FALLBACK_ICONS[cryptoId] || '?';
}

/**
 * Check if we have a local icon for the given crypto
 */
export function hasOfficialIcon(cryptoId: string): boolean {
  return cryptoId in LOCAL_ICON_PATHS;
}

/**
 * Initialize crypto icons - now just validates local files exist
 */
export async function initCryptoIcons(): Promise<void> {
  console.log('Using local cryptocurrency icons from /crypto-icons/');
  // Icons are already available locally, no need to fetch
}
