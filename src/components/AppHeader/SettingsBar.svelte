<script lang="ts">
  import LanguageSelector from '../LanguageSelector.svelte';
  import ThemeToggle from '../ThemeToggle.svelte';
</script>

<div class="settings-bar">
  <div class="settings-item">
    <LanguageSelector />
  </div>
  <div class="settings-divider"></div>
  <div class="settings-item">
    <ThemeToggle />
  </div>
</div>

<style>
  .settings-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: rgba(0, 0, 0, 0.03);
    border-radius: 0.5rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  :global(.dark) .settings-bar {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .settings-item {
    display: flex;
    align-items: center;
  }

  .settings-divider {
    width: 1px;
    height: 24px;
    background: rgba(0, 0, 0, 0.1);
  }

  :global(.dark) .settings-divider {
    background: rgba(255, 255, 255, 0.1);
  }

  /* Responsividade */
  @media (max-width: 640px) {
    .settings-bar {
      gap: 0.5rem;
      padding: 0.25rem 0.4rem;
    }

    .settings-divider {
      height: 20px;
    }
  }
</style>
