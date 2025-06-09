<script lang="ts">
import ATRIndicator from './ATRIndicator.svelte';
import type { CryptoConfig, CryptoData } from '../lib/crypto-config';
import { _ } from '../lib/i18n';
import { isTaapiConfigured, setTaapiSecretKey, showConfigStatus, clearTaapiSecretKey } from '../lib/config';

// Props - agora genérico para qualquer criptomoeda
export let cryptoConfig: CryptoConfig;
export let currentData: CryptoData | null = null;
export let loading = false;
export let atrError: string | null = null;
export let lastATRCheck: Date | null = null;
export let nextATRCheck: Date | null = null;
export let onConfigureATR: () => void = () => {};

// Estado para configuração da API TAAPI (apenas em desenvolvimento)
let showApiConfig = false;
let apiKeyInput = '';
let taapiConfigured = false;

// Funções para configuração da API TAAPI (apenas para desenvolvimento)
function configureApiKey() {
  // Bloquear em produção
  if (import.meta.env.PROD) {
    console.warn('API configuration not allowed in production');
    return;
  }
  
  if (apiKeyInput.trim()) {
    setTaapiSecretKey(apiKeyInput.trim());
    taapiConfigured = true;
    showApiConfig = false;
    apiKeyInput = '';
    console.log('TAAPI API key configured successfully');
    // Notificar o componente pai para atualizar ATR
    onConfigureATR();
  }
}

function checkTaapiStatus() {
  taapiConfigured = isTaapiConfigured();
  if (!import.meta.env.PROD) {
    showConfigStatus();
  }
}

function clearApiConfiguration() {
  // Bloquear em produção
  if (import.meta.env.PROD) {
    console.warn('API configuration not allowed in production');
    return;
  }
  
  clearTaapiSecretKey();
  taapiConfigured = false;
  atrError = null;
  showApiConfig = true;
  console.log('TAAPI configuration cleared');
}

// Verificar status inicial
checkTaapiStatus();
</script>

<!-- Container dos Indicadores TAAPI -->
<div class="card p-4 shadow-lg variant-filled-surface w-full">  <div class="text-center mb-4">
    <h2 class="h4 font-bold text-primary-500">
      {cryptoConfig.icon} Indicadores Técnicos - {cryptoConfig.name}
    </h2>
    <p class="text-sm text-surface-600-300-token mt-1">
      Análise técnica avançada para {cryptoConfig.name} com indicadores profissionais
    </p>
  </div>

  <!-- Status da configuração -->
  <div class="mb-4">
    <div class="flex items-center justify-between p-3 rounded bg-surface-200-700-token">
      <span class="font-medium">Status da API:</span>
      <div class="flex items-center gap-2">
        <div class={`w-3 h-3 rounded-full ${taapiConfigured ? 'bg-success-500' : 'bg-warning-500'}`}></div>
        <span class={taapiConfigured ? 'text-success-500' : 'text-warning-500'}>
          {taapiConfigured ? 'Configurado' : 'Não configurado'}
        </span>
      </div>
    </div>
  </div>

  {#if taapiConfigured}
    <!-- Seção dos Indicadores -->
    <div class="space-y-4">
      <!-- ATR14 Daily -->
      <div class="card variant-glass p-3 rounded">
        <h3 class="font-semibold mb-2 text-primary-500">ATR14 Daily</h3>
        <ATRIndicator          atr14Daily={currentData?.atr14Daily} 
          atrLastUpdated={currentData?.atrLastUpdated}
          loading={loading}
          error={atrError}
        />
        
        <!-- Informações sobre a última verificação -->
        {#if lastATRCheck && nextATRCheck}
          <div class="text-xs text-surface-600-300-token mt-2">
            Última verificação: {lastATRCheck.toLocaleTimeString()} | 
            Próxima: {nextATRCheck.toLocaleTimeString()}
          </div>
        {/if}
      </div>

      <!-- Placeholder para futuros indicadores -->
      <div class="card variant-ghost p-3 rounded border-2 border-dashed border-surface-300-600-token">
        <h3 class="font-semibold mb-2 text-surface-500">RSI14 Daily</h3>
        <p class="text-sm text-surface-600-300-token">Em breve - Relative Strength Index</p>
      </div>

      <div class="card variant-ghost p-3 rounded border-2 border-dashed border-surface-300-600-token">
        <h3 class="font-semibold mb-2 text-surface-500">MACD</h3>
        <p class="text-sm text-surface-600-300-token">Em breve - Moving Average Convergence Divergence</p>
      </div>

      <div class="card variant-ghost p-3 rounded border-2 border-dashed border-surface-300-600-token">
        <h3 class="font-semibold mb-2 text-surface-500">Bollinger Bands</h3>
        <p class="text-sm text-surface-600-300-token">Em breve - Bandas de Bollinger</p>
      </div>
    </div>

    <!-- Botão para reconfigurar (apenas em desenvolvimento) -->
    {#if !import.meta.env.PROD}
      <div class="text-center mt-4">        <button
          class="btn variant-outline-primary"
          onclick={() => {
            if (!import.meta.env.PROD) {
              showApiConfig = true;
            }
          }}
        >
          Reconfigurar API
        </button>
        
        {#if atrError}          <button
            class="btn variant-outline-error ml-2"
            onclick={clearApiConfiguration}
          >
            Limpar Configuração
          </button>
        {/if}
      </div>
    {/if}
  {:else}
    <!-- Configuração da API não feita -->
    {#if import.meta.env.PROD}
      <!-- Em produção, mostrar apenas aviso sem possibilidade de configurar -->
      <div class="text-center space-y-4">
        <div class="card variant-filled-surface p-4 rounded">
          <h3 class="font-semibold mb-2">🔧 Configuração necessária</h3>
          <p class="text-sm text-surface-600-300-token">
            Os indicadores técnicos TAAPI.IO requerem configuração de API key pelo administrador do sistema.
          </p>
          <p class="text-xs text-surface-500 mt-2">
            O rastreamento de Bitcoin continuará funcionando normalmente.
          </p>
        </div>
      </div>
    {:else}
      <!-- Em desenvolvimento, permitir configuração -->
      <div class="text-center space-y-4">
        <div class="card variant-filled-warning p-4 rounded">
          <h3 class="font-semibold mb-2">⚠️ API não configurada</h3>
          <p class="text-sm">Configure sua chave da API TAAPI.IO para acessar indicadores técnicos profissionais.</p>
        </div>
          <button
          class="btn variant-filled-primary"
          onclick={() => {
            if (!import.meta.env.PROD) {
              showApiConfig = true;
            }
          }}
        >
          Configurar API TAAPI.IO
        </button>
      </div>
    {/if}
  {/if}

  <!-- Modal/Seção de configuração da API (apenas em desenvolvimento) -->
  {#if showApiConfig && !import.meta.env.PROD}
    <div class="mt-6 p-4 border-2 border-primary-300 rounded bg-surface-100-800-token">
      <h3 class="font-semibold mb-3 text-primary-500">Configurar Chave API</h3>
      
      <div class="space-y-3">
        <div>
          <label for="api-key" class="block text-sm font-medium mb-2">
            Chave da API TAAPI.IO:
          </label>
          <input
            id="api-key"
            type="password"
            bind:value={apiKeyInput}
            placeholder="Insira sua chave da API..."
            class="input w-full"
            disabled={loading}
          />
        </div>
        
        <div class="flex gap-2">
          <button            class="btn variant-filled-primary flex-1"
            onclick={configureApiKey}
            disabled={!apiKeyInput.trim() || loading}
          >
            {taapiConfigured ? 'Atualizar Chave' : 'Configurar API'}
          </button>
          
          <button
            class="btn variant-outline-secondary"
            onclick={() => { showApiConfig = false; apiKeyInput = ''; }}
          >
            Cancelar
          </button>
        </div>
      </div>

      <!-- Instruções -->
      <div class="mt-4 text-xs text-surface-600-300-token space-y-1">
        <p class="font-medium">Como obter sua chave API:</p>
        <p>1. Visite <a href="https://taapi.io" target="_blank" class="text-primary-500 hover:underline">taapi.io</a></p>
        <p>2. Registre-se gratuitamente</p>
        <p>3. Acesse sua dashboard</p>
        <p>4. Copie sua chave API</p>
        <p>5. Cole aqui na configuração</p>
        
        {#if atrError && atrError.includes('401')}
          <div class="bg-error-500/20 p-2 rounded mt-2">
            <p class="text-error-400 font-medium">⚠️ Chave API inválida</p>
            <p class="text-error-300">Verifique se a chave foi copiada corretamente</p>
          </div>
        {/if}
        
        {#if !import.meta.env.PROD}
          <p class="text-warning-600">• Em desenvolvimento: a chave é armazenada no localStorage</p>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Informações sobre TAAPI -->
  <div class="mt-4 text-xs text-surface-600-300-token space-y-1">
    <p>• <strong>ATR14</strong> - Average True Range de 14 períodos para análise de volatilidade</p>
    <p>• <strong>Cache inteligente</strong> - Dados verificados a cada 5min e cacheados até o próximo dia</p>
    <p>• <strong>Plano gratuito</strong> - 500 chamadas/mês suficientes para uso pessoal</p>
    <p>• <a href="https://taapi.io" target="_blank" class="text-primary-500 hover:underline">Saiba mais sobre TAAPI.IO</a></p>
  </div>
</div>
