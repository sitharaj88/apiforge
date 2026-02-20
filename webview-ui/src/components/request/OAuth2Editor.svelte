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

<div class="flex flex-col h-full overflow-auto bg-vscode-editor-background/30 backdrop-blur-md border border-vscode-border/20 rounded-xl shadow-inner m-4">
  <!-- Grant Type Selector -->
  <div class="p-5 border-b border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-xl">
    <span class="block text-xs font-medium text-vscode-foreground/70 uppercase tracking-wider mb-3">Grant Type</span>
    <select
      class="select w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
      bind:value={config.grantType}
      on:change={handleConfigChange}
    >
      {#each grantTypes as gt}
        <option value={gt.value}>{gt.label}</option>
      {/each}
    </select>
    <p class="mt-2 text-xs text-vscode-foreground/50 flex items-center gap-1.5">
      <svg class="w-3.5 h-3.5 text-api-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {grantTypes.find(g => g.value === config.grantType)?.description}
    </p>
  </div>

  <!-- Configuration Fields -->
  <div class="p-5 space-y-5 flex-1 bg-vscode-editor-background/50">
    {#if showAuthUrl}
      <div>
        <span class="block text-xs font-medium text-vscode-foreground/70 mb-2">Authorization URL</span>
        <input
          type="text"
          class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
          placeholder="https://example.com/oauth/authorize"
          bind:value={config.authorizationUrl}
          on:input={handleConfigChange}
        />
      </div>
    {/if}

    <div>
      <span class="block text-xs font-medium text-vscode-foreground/70 mb-2">Token URL</span>
      <input
        type="text"
        class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
        placeholder="https://example.com/oauth/token"
        bind:value={config.tokenUrl}
        on:input={handleConfigChange}
      />
    </div>

    <div>
      <span class="block text-xs font-medium text-vscode-foreground/70 mb-2">Client ID</span>
      <input
        type="text"
        class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
        placeholder="your-client-id"
        bind:value={config.clientId}
        on:input={handleConfigChange}
      />
    </div>

    {#if showClientSecret}
      <div>
        <span class="block text-xs font-medium text-vscode-foreground/70 mb-2">Client Secret</span>
        <input
          type="password"
          class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
          placeholder="your-client-secret"
          bind:value={config.clientSecret}
          on:input={handleConfigChange}
        />
      </div>
    {/if}

    {#if showPassword}
      <div>
        <span class="block text-xs font-medium text-vscode-foreground/70 mb-2">Username</span>
        <input
          type="text"
          class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
          placeholder="username"
          bind:value={config.username}
          on:input={handleConfigChange}
        />
      </div>

      <div>
        <span class="block text-xs font-medium text-vscode-foreground/70 mb-2">Password</span>
        <input
          type="password"
          class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
          placeholder="password"
          bind:value={config.password}
          on:input={handleConfigChange}
        />
      </div>
    {/if}

    <div>
      <span class="block text-xs font-medium text-vscode-foreground/70 mb-2">Scope</span>
      <input
        type="text"
        class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
        placeholder="openid profile email"
        bind:value={config.scope}
        on:input={handleConfigChange}
      />
    </div>

    {#if showRedirectUri}
      <div>
        <span class="block text-xs font-medium text-vscode-foreground/70 mb-2">Redirect URI</span>
        <input
          type="text"
          class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
          placeholder="http://localhost:9876/callback"
          bind:value={config.redirectUri}
          on:input={handleConfigChange}
        />
        <p class="mt-2 text-xs text-vscode-foreground/50 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-api-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Register this URI in your OAuth provider
        </p>
      </div>
    {/if}
  </div>

  <!-- Token Display -->
  {#if token}
    <div class="p-5 border-t border-vscode-border/30 bg-vscode-sidebar-bg/40 backdrop-blur-md">
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-sm font-semibold text-vscode-foreground/80 uppercase tracking-wider">Current Token</h4>
        <div class="flex items-center gap-2">
          <button
            class="text-xs font-medium text-vscode-foreground/70 hover:text-api-primary transition-colors px-2 py-1.5 rounded-md hover:bg-api-primary/10"
            on:click={copyToken}
          >
            Copy
          </button>
          <button
            class="text-xs font-medium text-vscode-foreground/70 hover:text-red-400 transition-colors px-2 py-1.5 rounded-md hover:bg-red-500/10"
            on:click={handleClearToken}
          >
            Clear
          </button>
        </div>
      </div>

      <div class="space-y-3 bg-vscode-editor-background/50 p-4 rounded-xl border border-vscode-border/30 shadow-inner">
        <div class="flex items-center gap-3">
          <span class="text-xs font-medium text-vscode-foreground/50 uppercase tracking-wider w-20">Type:</span>
          <span class="text-sm font-medium text-vscode-foreground/90">{token.tokenType}</span>
        </div>

        <div>
          <span class="text-xs font-medium text-vscode-foreground/50 uppercase tracking-wider block mb-2">Access Token:</span>
          <div class="p-3 bg-vscode-editor-background/80 border border-vscode-border/30 rounded-lg text-xs font-mono text-vscode-foreground/80 break-all max-h-24 overflow-auto shadow-inner">
            {token.accessToken}
          </div>
        </div>

        {#if token.expiresAt}
          <div class="flex items-center gap-3">
            <span class="text-xs font-medium text-vscode-foreground/50 uppercase tracking-wider w-20">Status:</span>
            <span class="text-sm font-medium {Date.now() >= token.expiresAt ? 'text-red-400' : 'text-green-400'} flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full {Date.now() >= token.expiresAt ? 'bg-red-400' : 'bg-green-400'}"></span>
              {formatExpiresAt(token.expiresAt)}
            </span>
          </div>
        {/if}

        {#if token.scope}
          <div class="flex items-center gap-3">
            <span class="text-xs font-medium text-vscode-foreground/50 uppercase tracking-wider w-20">Scope:</span>
            <span class="text-sm font-medium text-vscode-foreground/90">{token.scope}</span>
          </div>
        {/if}

        {#if token.refreshToken}
          <div class="pt-2 mt-2 border-t border-vscode-border/20">
            <button
              class="text-xs font-medium text-api-primary hover:text-api-purple transition-colors flex items-center gap-1.5"
              on:click={handleRefreshToken}
              disabled={isLoading}
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Token
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Actions -->
  <div class="p-5 border-t border-vscode-border/30 bg-vscode-sidebar-bg/40 backdrop-blur-md">
    <button
      class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 {isLoading || !config.tokenUrl || !config.clientId ? 'bg-vscode-editor-background/50 text-vscode-foreground/40 cursor-not-allowed border border-vscode-border/30' : 'bg-gradient-to-r from-api-primary to-api-purple text-white shadow-[0_0_20px_rgba(var(--api-primary-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--api-primary-rgb),0.5)] hover:-translate-y-0.5 border border-white/10'}"
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
