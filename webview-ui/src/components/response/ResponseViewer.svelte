<script lang="ts">
  import { response, responseTab } from '../../lib/stores';
  import ResponseBody from './ResponseBody.svelte';
  import ResponseHeaders from './ResponseHeaders.svelte';
  import CodeGenerator from './CodeGenerator.svelte';
  import AssertionResults from './AssertionResults.svelte';

  export let generatedCode = '';
  export let assertionResults: any[] = [];

  const tabs = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers' },
    { id: 'cookies', label: 'Cookies' },
    { id: 'tests', label: 'Tests' },
    { id: 'code', label: 'Code' },
  ] as const;

  function getStatusClass(status: number): string {
    if (status >= 200 && status < 300) return 'status-success';
    if (status >= 300 && status < 400) return 'status-redirect';
    if (status >= 400 && status < 500) return 'status-client-error';
    return 'status-server-error';
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatTime(ms: number): string {
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  }

  function getHeadersCount(): number {
    if (!$response) return 0;
    return Object.keys($response.headers).length;
  }

  function getTestsStatus(): { passed: number; failed: number } {
    const passed = assertionResults.filter(r => r.passed).length;
    const failed = assertionResults.filter(r => !r.passed).length;
    return { passed, failed };
  }

  function handleLanguageChange(event: CustomEvent<string>) {
    // Dispatch to parent to generate code for selected language
    const customEvent = new CustomEvent('generateCode', { detail: event.detail });
    window.dispatchEvent(customEvent);
  }

  // Extract cookies from Set-Cookie headers
  function getCookies(): Array<{ name: string; value: string; attributes: string }> {
    if (!$response?.headers) return [];

    const setCookie = $response.headers['set-cookie'] || '';
    if (!setCookie) return [];

    const cookieStrings = setCookie.split(/,(?=[^;]*=)/);
    return cookieStrings.map(cookie => {
      const [nameValue, ...attrs] = cookie.split(';');
      const [name, ...valueParts] = nameValue?.split('=') || ['', ''];
      return {
        name: name?.trim() || '',
        value: valueParts.join('=').trim(),
        attributes: attrs.join(';').trim(),
      };
    }).filter(c => c.name);
  }

  $: cookies = getCookies();
  $: testsStatus = getTestsStatus();
</script>

<div class="flex flex-col h-full bg-vscode-editor-background/30 backdrop-blur-xl">
  {#if $response}
    <!-- Status Bar -->
    <div class="flex items-center justify-between px-4 py-2.5" style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-glass); backdrop-filter: blur(12px);">
      <div class="flex items-center gap-3">
        <span class="method-badge {getStatusClass($response.status)} flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
          {$response.status} {$response.statusText}
        </span>
        <div class="flex items-center gap-2 text-xs font-medium">
          <span class="flex items-center gap-1.5 px-2 py-1 rounded-md" style="background:var(--bg-glass-md); border: 1px solid var(--border-subtle); color: var(--text-secondary);">
            <svg class="w-3 h-3" style="color: var(--api-info);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime($response.time)}
          </span>
          <span class="flex items-center gap-1.5 px-2 py-1 rounded-md" style="background:var(--bg-glass-md); border: 1px solid var(--border-subtle); color: var(--text-secondary);">
            <svg class="w-3 h-3" style="color: var(--api-purple);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            {formatSize($response.size)}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button
          class="btn-icon w-7 h-7"
          title="Copy response body"
          on:click={() => navigator.clipboard.writeText($response?.body || '')}
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  {/if}

  <!-- Tabs -->
  <div class="flex items-center gap-0.5 px-2 pt-1" style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-glass); backdrop-filter: blur(8px);">
    {#each tabs as tab}
      <button
        class="tab relative flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium {!$response && tab.id !== 'code' ? 'opacity-35 cursor-not-allowed' : ''} {$responseTab === tab.id ? 'tab-active' : ''}"
        on:click={() => responseTab.set(tab.id)}
        disabled={!$response && tab.id !== 'code'}
      >
        {tab.label}
        {#if tab.id === 'headers' && $response}
          <span class="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold" style="background:rgba(var(--api-primary-rgb),0.14);color:var(--api-primary);border:1px solid rgba(var(--api-primary-rgb),0.22);">{getHeadersCount()}</span>
        {:else if tab.id === 'cookies' && cookies.length > 0}
          <span class="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold" style="background:rgba(var(--api-warning-rgb),0.14);color:var(--api-warning);border:1px solid rgba(var(--api-warning-rgb),0.22);">{cookies.length}</span>
        {:else if tab.id === 'tests' && assertionResults.length > 0}
          <span class="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold" style="{testsStatus.failed > 0 ? 'background:rgba(var(--api-error-rgb),0.14);color:var(--api-error);border:1px solid rgba(var(--api-error-rgb),0.22)' : 'background:rgba(var(--api-success-rgb),0.14);color:var(--api-success);border:1px solid rgba(var(--api-success-rgb),0.22)'}">{testsStatus.passed}/{assertionResults.length}</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-hidden relative">
    {#if $responseTab === 'code'}
      <CodeGenerator
        code={generatedCode}
        on:languageChange={handleLanguageChange}
      />
    {:else if !$response}
      <!-- No Response -->
      <div class="absolute inset-0 flex flex-col items-center justify-center animate-fade-in">
        <div class="relative w-20 h-20 mb-5 flex items-center justify-center">
          <div class="absolute inset-0 rounded-2xl rotate-6" style="background: linear-gradient(135deg, rgba(var(--api-primary-rgb),0.1), rgba(var(--api-purple-rgb),0.08)); border: 1px solid rgba(var(--api-primary-rgb),0.12);"></div>
          <div class="absolute inset-0 rounded-2xl" style="background: linear-gradient(135deg, rgba(var(--api-primary-rgb),0.08), rgba(var(--api-purple-rgb),0.06)); border: 1px solid var(--border-subtle);"></div>
          <svg class="w-9 h-9 relative z-10" style="color: rgba(var(--api-primary-rgb),0.5);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        </div>
        <p class="text-sm font-semibold mb-1" style="color: var(--text-secondary);">No response yet</p>
        <p class="text-xs" style="color: var(--text-muted);">Hit Send to execute your request</p>
      </div>
    {:else if $responseTab === 'body'}
      <ResponseBody body={$response.body} headers={$response.headers} />
    {:else if $responseTab === 'headers'}
      <ResponseHeaders headers={$response.headers} />
    {:else if $responseTab === 'cookies'}
      <div class="h-full overflow-auto bg-vscode-editor-background/30">
        {#if cookies.length === 0}
          <div class="flex flex-col items-center justify-center h-full text-vscode-foreground/40">
            <svg class="w-12 h-12 mb-4 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p class="text-sm font-medium">No cookies in response</p>
          </div>
        {:else}
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-vscode-border/30 bg-vscode-sidebar-bg/40 backdrop-blur-md">
                <th class="px-6 py-3 text-xs font-semibold text-vscode-foreground/70 uppercase tracking-wider">Name</th>
                <th class="px-6 py-3 text-xs font-semibold text-vscode-foreground/70 uppercase tracking-wider">Value</th>
                <th class="px-6 py-3 text-xs font-semibold text-vscode-foreground/70 uppercase tracking-wider">Attributes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-vscode-border/10">
              {#each cookies as cookie}
                <tr class="hover:bg-vscode-list-hover/30 transition-colors duration-150 group">
                  <td class="px-6 py-3 text-sm font-medium text-blue-400/90 group-hover:text-blue-400 transition-colors">{cookie.name}</td>
                  <td class="px-6 py-3 text-sm font-mono text-vscode-foreground/80 break-all">{cookie.value}</td>
                  <td class="px-6 py-3 text-xs text-vscode-foreground/50 font-mono">{cookie.attributes}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    {:else if $responseTab === 'tests'}
      <AssertionResults results={assertionResults} />
    {/if}
  </div>
</div>
