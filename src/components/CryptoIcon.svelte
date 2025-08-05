<script lang="ts">
  import { getCryptoIcon, getFallbackIcon, hasOfficialIcon } from '../lib/crypto-icons';
  
  export let cryptoId: string;
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let className: string = '';
  
  $: iconUrl = getCryptoIcon(cryptoId);
  $: fallbackIcon = getFallbackIcon(cryptoId);
  $: hasIcon = hasOfficialIcon(cryptoId);
  
  // Size mappings
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };
  
  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };
</script>

{#if hasIcon && iconUrl}
  <img 
    src={iconUrl} 
    alt={`${cryptoId} icon`}
    class={`${sizeClasses[size]} ${className} rounded-full`}
    loading="lazy"
    on:error={() => {
      // If image fails to load, component will re-render with fallback
      console.warn(`Failed to load icon for ${cryptoId}, using fallback`);
    }}
  />
{:else}
  <span class={`${textSizes[size]} ${className} font-bold`}>
    {fallbackIcon}
  </span>
{/if}
