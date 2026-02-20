<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface OAuth2Config {
    grantType: string;
    authorizationUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope: string;
    redirectUri: string;
    username: string;
    password: string;
  }

  interface OAuth2Token {
    accessToken: string;
    tokenType: string;
    expiresIn?: number;
    refreshToken?: string;
    scope?: string;
    expiresAt?: number;
  }

  export let config: OAuth2Config = {
    grantType: 'authorization_code_pkce',
    authorizationUrl: '',
    tokenUrl: '',
    clientId: '',
    clientSecret: '',
    scope: '',
    redirectUri: 'http://localhost:9876/callback',
    username: '',
    password: '',
  };

  export let token: OAuth2Token | null = null;
  export let isLoading = false;

  const dispatch = createEventDispatcher<{
    configChange: OAuth2Config;
    getToken: void;
    refreshToken: void;
    clearToken: void;
  }>();

  const grantTypes = [
    { value: 'authorization_code_pkce', label: 'Authorization Code (with PKCE)', description: 'Most secure for public clients' },
    { value: 'authorization_code', label: 'Authorization Code', description: 'Requires client secret' },
    { value: 'client_credentials', label: 'Client Credentials', description: 'Server-to-server authentication' },
    { value: 'password', label: 'Password', description: 'Deprecated, use only for legacy APIs' },
  ];

  function handleConfigChange() {
    dispatch('configChange', config);
  }

  function handleGetToken() {
    dispatch('getToken');
  }

  function handleRefreshToken() {
    dispatch('refreshToken');
  }

  function handleClearToken() {
    dispatch('clearToken');
  }

  function formatExpiresAt(expiresAt: number): string {
    const date = new Date(expiresAt);
    const now = Date.now();
    const diff = expiresAt - now;

    if (diff <= 0) {
      return 'Expired';
    }

    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) {
      return `Expires in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(minutes / 60);
    return `Expires in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  async function copyToken() {
    if (token?.accessToken) {
      await navigator.clipboard.writeText(token.accessToken);
    }
  }

  $: showAuthUrl = ['authorization_code', 'authorization_code_pkce'].includes(config.grantType);
  $: showClientSecret = ['authorization_code', 'client_credentials'].includes(config.grantType);
  $: showPassword = config.grantType === 'password';
  $: showRedirectUri = ['authorization_code', 'authorization_code_pkce'].includes(config.grantType);
</script>

<div class="flex flex-col h-full overflow-auto">
  <!-- Grant Type Selector -->
  <div class="p-4 border-b border-vscode-border">
    <label class="block text-xs font-medium text-vscode-foreground mb-2">Grant Type</label>
    <select
      class="input w-full"
      bind:value={config.grantType}
      on:change={handleConfigChange}
    >
      {#each grantTypes as gt}
        <option value={gt.value}>{gt.label}</option>
      {/each}
    </select>
    <p class="mt-1 text-xs text-vscode-foreground" style="opacity: 0.6;">
      {grantTypes.find(g => g.value === config.grantType)?.description}
    </p>
  </div>

  <!-- Configuration Fields -->
  <div class="p-4 space-y-4 flex-1">
    {#if showAuthUrl}
      <div>
        <label class="block text-xs font-medium text-vscode-foreground mb-1">Authorization URL</label>
        <input
          type="text"
          class="input w-full"
          placeholder="https://example.com/oauth/authorize"
          bind:value={config.authorizationUrl}
          on:input={handleConfigChange}
        />
      </div>
    {/if}

    <div>
      <label class="block text-xs font-medium text-vscode-foreground mb-1">Token URL</label>
      <input
        type="text"
        class="input w-full"
        placeholder="https://example.com/oauth/token"
        bind:value={config.tokenUrl}
        on:input={handleConfigChange}
      />
    </div>

    <div>
      <label class="block text-xs font-medium text-vscode-foreground mb-1">Client ID</label>
      <input
        type="text"
        class="input w-full"
        placeholder="your-client-id"
        bind:value={config.clientId}
        on:input={handleConfigChange}
      />
    </div>

    {#if showClientSecret}
      <div>
        <label class="block text-xs font-medium text-vscode-foreground mb-1">Client Secret</label>
        <input
          type="password"
          class="input w-full"
          placeholder="your-client-secret"
          bind:value={config.clientSecret}
          on:input={handleConfigChange}
        />
      </div>
    {/if}

    {#if showPassword}
      <div>
        <label class="block text-xs font-medium text-vscode-foreground mb-1">Username</label>
        <input
          type="text"
          class="input w-full"
          placeholder="username"
          bind:value={config.username}
          on:input={handleConfigChange}
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-vscode-foreground mb-1">Password</label>
        <input
          type="password"
          class="input w-full"
          placeholder="password"
          bind:value={config.password}
          on:input={handleConfigChange}
        />
      </div>
    {/if}

    <div>
      <label class="block text-xs font-medium text-vscode-foreground mb-1">Scope</label>
      <input
        type="text"
        class="input w-full"
        placeholder="openid profile email"
        bind:value={config.scope}
        on:input={handleConfigChange}
      />
    </div>

    {#if showRedirectUri}
      <div>
        <label class="block text-xs font-medium text-vscode-foreground mb-1">Redirect URI</label>
        <input
          type="text"
          class="input w-full"
          placeholder="http://localhost:9876/callback"
          bind:value={config.redirectUri}
          on:input={handleConfigChange}
        />
        <p class="mt-1 text-xs text-vscode-foreground" style="opacity: 0.6;">
          Register this URI in your OAuth provider
        </p>
      </div>
    {/if}
  </div>

  <!-- Token Display -->
  {#if token}
    <div class="p-4 border-t border-vscode-border bg-vscode-sidebar-bg">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-medium text-vscode-foreground">Current Token</h4>
        <div class="flex items-center gap-2">
          <button
            class="text-xs text-vscode-link hover:text-vscode-link-hover"
            on:click={copyToken}
          >
            Copy
          </button>
          <button
            class="text-xs text-vscode-foreground hover:text-red-400"
            style="opacity: 0.6;"
            on:click={handleClearToken}
          >
            Clear
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="text-xs text-vscode-foreground" style="opacity: 0.6;">Type:</span>
          <span class="text-xs text-vscode-foreground">{token.tokenType}</span>
        </div>

        <div>
          <span class="text-xs text-vscode-foreground" style="opacity: 0.6;">Access Token:</span>
          <div class="mt-1 p-2 bg-vscode-input-bg rounded text-xs font-mono text-vscode-foreground break-all max-h-20 overflow-auto">
            {token.accessToken}
          </div>
        </div>

        {#if token.expiresAt}
          <div class="flex items-center gap-2">
            <span class="text-xs text-vscode-foreground" style="opacity: 0.6;">Status:</span>
            <span class="text-xs {Date.now() >= token.expiresAt ? 'text-red-400' : 'text-green-400'}">
              {formatExpiresAt(token.expiresAt)}
            </span>
          </div>
        {/if}

        {#if token.scope}
          <div class="flex items-center gap-2">
            <span class="text-xs text-vscode-foreground" style="opacity: 0.6;">Scope:</span>
            <span class="text-xs text-vscode-foreground">{token.scope}</span>
          </div>
        {/if}

        {#if token.refreshToken}
          <button
            class="text-xs text-vscode-link hover:text-vscode-link-hover"
            on:click={handleRefreshToken}
            disabled={isLoading}
          >
            Refresh Token
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Actions -->
  <div class="p-4 border-t border-vscode-border bg-vscode-sidebar-bg">
    <button
      class="btn btn-primary w-full flex items-center justify-center gap-2"
      on:click={handleGetToken}
      disabled={isLoading || !config.tokenUrl || !config.clientId}
    >
      {#if isLoading}
        <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Getting Token...
      {:else}
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        Get New Access Token
      {/if}
    </button>
  </div>
</div>

<style>
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
