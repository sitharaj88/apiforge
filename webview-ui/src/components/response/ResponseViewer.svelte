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

<div class="flex flex-col h-full bg-vscode-editor-background">
  {#if $response}
    <!-- Status Bar -->
    <div class="flex items-center justify-between px-6 py-3 border-b border-vscode-border bg-vscode-sidebar-bg/50 backdrop-blur-sm">
      <div class="flex items-center gap-4">
        <span class="badge shadow-sm {getStatusClass($response.status)}">
          <span class="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse"></span>
          {$response.status} {$response.statusText}
        </span>
        <div class="flex items-center gap-3 text-xs font-medium text-vscode-foreground/60">
          <span class="flex items-center gap-1.5 bg-vscode-editor-background/50 px-2 py-1 rounded-md border border-vscode-border">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime($response.time)}
          </span>
          <span class="flex items-center gap-1.5 bg-vscode-editor-background/50 px-2 py-1 rounded-md border border-vscode-border">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            {formatSize($response.size)}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="btn-icon text-vscode-foreground/50 hover:text-vscode-foreground hover:bg-vscode-list-hover transition-all duration-200"
          title="Copy response"
          on:click={() => navigator.clipboard.writeText($response?.body || '')}
        >
          <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  {/if}

  <!-- Tabs -->
  <div class="flex items-center gap-2 px-6 border-b border-vscode-border bg-vscode-sidebar-bg/30">
    {#each tabs as tab}
      <button
        class="tab"
        class:tab-active={$responseTab === tab.id}
        on:click={() => responseTab.set(tab.id)}
        disabled={!$response && tab.id !== 'code'}
        class:opacity-50={!$response && tab.id !== 'code'}
      >
        {tab.label}
        {#if tab.id === 'headers' && $response}
          <span class="ml-1.5 badge">{getHeadersCount()}</span>
        {:else if tab.id === 'cookies' && cookies.length > 0}
          <span class="ml-1.5 badge">{cookies.length}</span>
        {:else if tab.id === 'tests' && assertionResults.length > 0}
          <span class="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded-md {testsStatus.failed > 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}">
            {testsStatus.passed}/{assertionResults.length}
          </span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-hidden">
    {#if $responseTab === 'code'}
      <CodeGenerator
        code={generatedCode}
        on:languageChange={handleLanguageChange}
      />
    {:else if !$response}
      <!-- No Response -->
      <div class="flex flex-col items-center justify-center h-full text-vscode-foreground/50 bg-vscode-editor-background/30">
        <div class="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center border border-white/5 shadow-inner">
          <svg class="w-12 h-12 text-blue-400/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p class="text-xl font-semibold text-vscode-foreground/80 tracking-tight">No Response Yet</p>
        <p class="text-sm mt-2 text-vscode-foreground/50">Send a request to see the response</p>
      </div>
    {:else if $responseTab === 'body'}
      <ResponseBody body={$response.body} headers={$response.headers} />
    {:else if $responseTab === 'headers'}
      <ResponseHeaders headers={$response.headers} />
    {:else if $responseTab === 'cookies'}
      <div class="h-full overflow-auto">
        {#if cookies.length === 0}
          <div class="p-4 text-center text-vscode-foreground" style="opacity: 0.5;">
            <p class="text-sm">No cookies in response</p>
          </div>
        {:else}
          <table class="w-full">
            <thead>
              <tr class="border-b border-vscode-border bg-vscode-sidebar-bg">
                <th class="px-4 py-2 text-left text-xs font-medium text-vscode-foreground">Name</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-vscode-foreground">Value</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-vscode-foreground">Attributes</th>
              </tr>
            </thead>
            <tbody>
              {#each cookies as cookie}
                <tr class="border-b border-vscode-border hover:bg-vscode-list-hover">
                  <td class="px-4 py-2 text-sm font-medium text-vscode-link">{cookie.name}</td>
                  <td class="px-4 py-2 text-sm font-mono text-vscode-foreground break-all">{cookie.value}</td>
                  <td class="px-4 py-2 text-xs text-vscode-foreground" style="opacity: 0.6;">{cookie.attributes}</td>
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
