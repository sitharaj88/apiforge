<script lang="ts">
  import { activeRequest, type AuthType, getOAuth2Token, oauth2Token, oauth2Loading, oauth2Error, type OAuth2Config } from '../../lib/stores';

  const authTypes: { id: AuthType; label: string; description: string }[] = [
    { id: 'none', label: 'No Auth', description: 'No authentication' },
    { id: 'basic', label: 'Basic Auth', description: 'Username and password' },
    { id: 'bearer', label: 'Bearer Token', description: 'JWT or OAuth token' },
    { id: 'api-key', label: 'API Key', description: 'Custom API key header or query param' },
    { id: 'oauth2', label: 'OAuth 2.0', description: 'OAuth 2.0 authentication flow' },
  ];

  // OAuth 2.0 configuration
  let oauth2Config: OAuth2Config = {
    grantType: 'authorization_code_pkce',
    authorizationUrl: '',
    tokenUrl: '',
    clientId: '',
    clientSecret: '',
    scope: '',
    redirectUri: 'http://localhost:9876/callback',
  };

  const grantTypes = [
    { id: 'authorization_code_pkce', label: 'Authorization Code (with PKCE)', description: 'Most secure, recommended for public clients' },
    { id: 'authorization_code', label: 'Authorization Code', description: 'For confidential clients' },
    { id: 'client_credentials', label: 'Client Credentials', description: 'For server-to-server authentication' },
    { id: 'password', label: 'Password', description: 'Deprecated, use only for trusted apps' },
  ];

  function handleAuthTypeChange(type: AuthType) {
    activeRequest.update((r) => ({
      ...r,
      auth: {
        type,
        basic: type === 'basic' ? { username: '', password: '' } : undefined,
        bearer: type === 'bearer' ? { token: '' } : undefined,
        apiKey: type === 'api-key' ? { key: '', value: '', addTo: 'header' } : undefined,
      },
    }));
  }

  function handleGetToken() {
    const tokenKey = `request-${$activeRequest.id}`;
    getOAuth2Token(oauth2Config, tokenKey);
  }

  function handleUseToken() {
    if ($oauth2Token) {
      activeRequest.update((r) => ({
        ...r,
        auth: {
          type: 'bearer',
          bearer: { token: $oauth2Token!.accessToken },
        },
      }));
    }
  }

  $: needsAuthUrl = oauth2Config.grantType === 'authorization_code' || oauth2Config.grantType === 'authorization_code_pkce';
  $: needsCredentials = oauth2Config.grantType === 'password';
</script>

<div class="space-y-6 p-4">
  <!-- Auth Type Selector -->
  <div class="space-y-2">
    <span class="text-xs font-medium text-vscode-foreground/70 uppercase tracking-wider">Authentication Type</span>
    <div class="relative">
      <select
        class="select w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
        value={$activeRequest.auth.type}
        on:change={(e) => handleAuthTypeChange(e.currentTarget.value as AuthType)}
      >
        {#each authTypes as type}
          <option value={type.id}>{type.label}</option>
        {/each}
      </select>
    </div>
    <p class="text-xs text-vscode-foreground/50 mt-1">
      {authTypes.find((t) => t.id === $activeRequest.auth.type)?.description}
    </p>
  </div>

  <!-- Auth Type Specific Fields -->
  <div class="bg-vscode-editor-background/30 backdrop-blur-md border border-vscode-border/20 rounded-xl p-5 shadow-inner">
    {#if $activeRequest.auth.type === 'none'}
      <div class="text-center py-10 text-vscode-foreground/50 flex flex-col items-center justify-center">
        <div class="w-16 h-16 rounded-full bg-vscode-editor-background/50 flex items-center justify-center mb-4 shadow-inner border border-vscode-border/30">
          <svg class="w-8 h-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <p class="text-sm font-medium">No authentication required for this request</p>
      </div>
    {:else if $activeRequest.auth.type === 'basic'}
      <div class="space-y-4">
        <div class="space-y-1.5">
          <span class="text-xs font-medium text-vscode-foreground/70">Username</span>
          <input
            type="text"
            class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
            placeholder="Enter username"
            bind:value={$activeRequest.auth.basic!.username}
          />
        </div>
        <div class="space-y-1.5">
          <span class="text-xs font-medium text-vscode-foreground/70">Password</span>
          <input
            type="password"
            class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
            placeholder="Enter password"
            bind:value={$activeRequest.auth.basic!.password}
          />
        </div>
        <div class="flex items-start gap-2 mt-4 p-3 rounded-lg bg-api-primary/5 border border-api-primary/10">
          <svg class="w-4 h-4 text-api-primary mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-xs text-vscode-foreground/60 leading-relaxed">
            Credentials will be Base64 encoded and sent in the <code class="px-1 py-0.5 rounded bg-vscode-editor-background/50 text-api-primary">Authorization</code> header
          </p>
        </div>
      </div>
    {:else if $activeRequest.auth.type === 'bearer'}
      <div class="space-y-4">
        <div class="space-y-1.5">
          <span class="text-xs font-medium text-vscode-foreground/70">Token</span>
          <textarea
            class="input w-full font-mono text-sm min-h-[120px] resize-y bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
            placeholder="Enter bearer token (JWT, OAuth token, etc.)"
            bind:value={$activeRequest.auth.bearer!.token}
          ></textarea>
        </div>
        <div class="flex items-start gap-2 mt-4 p-3 rounded-lg bg-api-primary/5 border border-api-primary/10">
          <svg class="w-4 h-4 text-api-primary mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-xs text-vscode-foreground/60 leading-relaxed">
            Token will be sent as: <code class="px-1 py-0.5 rounded bg-vscode-editor-background/50 text-api-primary">Authorization: Bearer &lt;token&gt;</code>
          </p>
        </div>
      </div>
    {:else if $activeRequest.auth.type === 'api-key'}
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <span class="text-xs font-medium text-vscode-foreground/70">Key Name</span>
            <input
              type="text"
              class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
              placeholder="e.g., X-API-Key, api_key"
              bind:value={$activeRequest.auth.apiKey!.key}
            />
          </div>
          <div class="space-y-1.5">
            <span class="text-xs font-medium text-vscode-foreground/70">Add to</span>
            <select class="select w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200" bind:value={$activeRequest.auth.apiKey!.addTo}>
              <option value="header">Header</option>
          <option value="query">Query Parameter</option>
        </select>
      </div>
    </div>
    <div class="space-y-1.5 mt-4">
      <span class="text-xs font-medium text-vscode-foreground/70">Value</span>
      <input
        type="password"
        class="input w-full font-mono bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
        placeholder="Enter API key value"
        bind:value={$activeRequest.auth.apiKey!.value}
      />
    </div>
  </div>
  {:else if $activeRequest.auth.type === 'oauth2'}
    <div class="space-y-5">
      <!-- Grant Type -->
      <div class="space-y-1.5">
        <span class="text-xs font-medium text-vscode-foreground/70">Grant Type</span>
        <select class="select w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200" bind:value={oauth2Config.grantType}>
          {#each grantTypes as grant}
            <option value={grant.id}>{grant.label}</option>
          {/each}
        </select>
        <p class="text-xs text-vscode-foreground/50 mt-1">
          {grantTypes.find(g => g.id === oauth2Config.grantType)?.description}
        </p>
      </div>

      <!-- Authorization URL (for auth code flows) -->
      {#if needsAuthUrl}
        <div class="space-y-1.5">
          <span class="text-xs font-medium text-vscode-foreground/70">Authorization URL</span>
          <input
            type="url"
            class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
            placeholder="https://auth.example.com/authorize"
            bind:value={oauth2Config.authorizationUrl}
          />
        </div>
      {/if}

      <!-- Token URL -->
      <div class="space-y-1.5">
        <span class="text-xs font-medium text-vscode-foreground/70">Token URL</span>
        <input
          type="url"
          class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
          placeholder="https://auth.example.com/token"
          bind:value={oauth2Config.tokenUrl}
        />
      </div>

      <!-- Client ID -->
      <div class="space-y-1.5">
        <span class="text-xs font-medium text-vscode-foreground/70">Client ID</span>
        <input
          type="text"
          class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
          placeholder="your-client-id"
          bind:value={oauth2Config.clientId}
        />
      </div>

      <!-- Client Secret -->
      <div class="space-y-1.5">
        <span class="text-xs font-medium text-vscode-foreground/70">Client Secret <span class="opacity-50 font-normal">(optional for PKCE)</span></span>
        <input
          type="password"
          class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
          placeholder="your-client-secret"
          bind:value={oauth2Config.clientSecret}
        />
      </div>

      <!-- Username/Password for password grant -->
      {#if needsCredentials}
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <span class="text-xs font-medium text-vscode-foreground/70">Username</span>
            <input
              type="text"
              class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
              placeholder="username"
              bind:value={oauth2Config.username}
            />
          </div>
          <div class="space-y-1.5">
            <span class="text-xs font-medium text-vscode-foreground/70">Password</span>
            <input
              type="password"
              class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
              placeholder="password"
              bind:value={oauth2Config.password}
            />
          </div>
        </div>
      {/if}

      <!-- Scope -->
      <div class="space-y-1.5">
        <span class="text-xs font-medium text-vscode-foreground/70">Scope <span class="opacity-50 font-normal">(space-separated)</span></span>
        <input
          type="text"
          class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
          placeholder="openid profile email"
          bind:value={oauth2Config.scope}
        />
      </div>

      <!-- Callback URL -->
      {#if needsAuthUrl}
        <div class="space-y-1.5">
          <span class="text-xs font-medium text-vscode-foreground/70">Callback URL</span>
          <input
            type="url"
            class="input w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
            placeholder="http://localhost:9876/callback"
            bind:value={oauth2Config.redirectUri}
          />
        </div>
      {/if}

      <!-- Error Display -->
      {#if $oauth2Error}
        <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3 shadow-inner">
          <svg class="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>{$oauth2Error}</p>
        </div>
      {/if}

      <!-- Token Display -->
      {#if $oauth2Token}
        <div class="p-4 rounded-xl bg-green-500/10 border border-green-500/30 space-y-3 shadow-inner">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
              <span class="text-sm text-green-400 font-medium">Token Received</span>
            </div>
            <button
              class="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors font-medium border border-green-500/30"
              on:click={handleUseToken}
            >
              Use Token
            </button>
          </div>
          <div class="text-xs text-vscode-foreground/70 space-y-1 bg-vscode-editor-background/50 p-3 rounded-lg border border-vscode-border/30">
            <p><span class="font-medium text-vscode-foreground/90">Type:</span> {$oauth2Token.tokenType}</p>
            {#if $oauth2Token.expiresIn}
              <p><span class="font-medium text-vscode-foreground/90">Expires in:</span> {$oauth2Token.expiresIn}s</p>
            {/if}
            {#if $oauth2Token.scope}
              <p><span class="font-medium text-vscode-foreground/90">Scope:</span> {$oauth2Token.scope}</p>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Get Token Button -->
      <button
        class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-api-primary to-api-purple text-white text-sm font-medium hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(var(--api-primary-rgb),0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        on:click={handleGetToken}
        disabled={$oauth2Loading || !oauth2Config.tokenUrl || !oauth2Config.clientId}
      >
        {#if $oauth2Loading}
          <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Getting Token...
        {:else}
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
          Get New Token
        {/if}
      </button>
    </div>
  {/if}
  </div>
</div>

<style>
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
