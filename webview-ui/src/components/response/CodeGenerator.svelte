<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface Language {
    id: string;
    name: string;
    category: string;
    icon: string;
  }

  export let code = '';

  const dispatch = createEventDispatcher<{ languageChange: string }>();

  const languages: Language[] = [
    { id: 'curl', name: 'cURL', category: 'Shell', icon: '🐚' },
    { id: 'javascript_fetch', name: 'Fetch', category: 'JavaScript', icon: '🟨' },
    { id: 'javascript_axios', name: 'Axios', category: 'JavaScript', icon: '🟨' },
    { id: 'javascript_node', name: 'Node.js', category: 'JavaScript', icon: '🟩' },
    { id: 'python_requests', name: 'Requests', category: 'Python', icon: '🐍' },
    { id: 'python_httpx', name: 'HTTPX', category: 'Python', icon: '🐍' },
    { id: 'go', name: 'Go', category: 'Go', icon: '🔵' },
    { id: 'java', name: 'HttpClient', category: 'Java', icon: '☕' },
    { id: 'csharp', name: 'HttpClient', category: 'C#', icon: '🟪' },
    { id: 'php_curl', name: 'cURL', category: 'PHP', icon: '🐘' },
    { id: 'php_guzzle', name: 'Guzzle', category: 'PHP', icon: '🐘' },
    { id: 'ruby', name: 'Net::HTTP', category: 'Ruby', icon: '💎' },
    { id: 'swift', name: 'URLSession', category: 'Swift', icon: '🍎' },
    { id: 'kotlin', name: 'OkHttp', category: 'Kotlin', icon: '🟠' },
  ];

  // Group languages by category
  const categories = [...new Set(languages.map(l => l.category))];

  let selectedLanguage = 'curl';
  let copied = false;
  let showDropdown = false;

  $: selectedLang = languages.find(l => l.id === selectedLanguage);

  function handleLanguageChange(langId: string) {
    selectedLanguage = langId;
    showDropdown = false;
    dispatch('languageChange', langId);
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  function downloadCode() {
    const lang = languages.find((l) => l.id === selectedLanguage);
    const extensions: Record<string, string> = {
      Shell: 'sh',
      JavaScript: 'js',
      Python: 'py',
      Go: 'go',
      Java: 'java',
      'C#': 'cs',
      PHP: 'php',
      Ruby: 'rb',
      Swift: 'swift',
      Kotlin: 'kt',
    };
    const ext = extensions[lang?.category ?? ''] || 'txt';
    const filename = `request.${ext}`;

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.language-dropdown')) {
      showDropdown = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="flex flex-col h-full">
  <!-- Modern Toolbar -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-vscode-border bg-vscode-sidebar-bg">
    <!-- Language Selector Dropdown -->
    <div class="language-dropdown relative">
      <button
        class="flex items-center gap-2 px-3 py-2 rounded-lg bg-vscode-editor-bg border border-vscode-border hover:border-vscode-focus-border transition-colors"
        on:click|stopPropagation={() => showDropdown = !showDropdown}
      >
        <span class="text-base">{selectedLang?.icon}</span>
        <div class="text-left">
          <div class="text-sm font-medium text-vscode-foreground">{selectedLang?.name}</div>
          <div class="text-xs text-vscode-foreground" style="opacity: 0.5;">{selectedLang?.category}</div>
        </div>
        <svg class="w-4 h-4 ml-2 text-vscode-foreground transition-transform {showDropdown ? 'rotate-180' : ''}" style="opacity: 0.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {#if showDropdown}
        <div class="dropdown-menu absolute top-full left-0 mt-2 w-80 max-h-96 overflow-auto rounded-lg z-50 border border-vscode-border">
          {#each categories as category}
            <div class="dropdown-header px-4 py-2 text-xs font-semibold text-vscode-foreground uppercase tracking-wider sticky top-0 border-b border-vscode-border">
              {category}
            </div>
            {#each languages.filter(l => l.category === category) as lang}
              <button
                class="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors {selectedLanguage === lang.id ? 'bg-vscode-list-active-bg' : 'hover:bg-vscode-list-hover'}"
                on:click={() => handleLanguageChange(lang.id)}
              >
                <span class="text-lg w-6 text-center">{lang.icon}</span>
                <span class="text-sm text-vscode-foreground flex-1">{lang.name}</span>
                {#if selectedLanguage === lang.id}
                  <svg class="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                {/if}
              </button>
            {/each}
          {/each}
        </div>
      {/if}
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-1">
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all {copied ? 'bg-green-500/20 text-green-400' : 'hover:bg-vscode-list-hover text-vscode-foreground'}"
        style={!copied ? 'opacity: 0.8;' : ''}
        on:click={copyCode}
        title="Copy to clipboard"
      >
        {#if copied}
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>Copied!</span>
        {:else}
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy</span>
        {/if}
      </button>
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-vscode-list-hover text-vscode-foreground transition-colors"
        style="opacity: 0.8;"
        on:click={downloadCode}
        title="Download as file"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Download</span>
      </button>
    </div>
  </div>

  <!-- Code Display with Line Numbers -->
  <div class="flex-1 overflow-auto bg-vscode-editor-bg">
    {#if code}
      <div class="flex text-sm font-mono">
        <!-- Line Numbers -->
        <div class="flex-shrink-0 py-4 pr-4 pl-4 text-right select-none border-r border-vscode-border" style="min-width: 3rem;">
          {#each code.split('\n') as _, i}
            <div class="text-vscode-foreground leading-6" style="opacity: 0.3;">{i + 1}</div>
          {/each}
        </div>
        <!-- Code -->
        <pre class="flex-1 p-4 text-vscode-foreground whitespace-pre-wrap leading-6 overflow-x-auto">{code}</pre>
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center h-full text-vscode-foreground" style="opacity: 0.5;">
        <svg class="w-12 h-12 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <p class="text-sm">No code generated yet</p>
        <p class="text-xs mt-1">Configure a request to generate code</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .dropdown-menu {
    background: var(--vscode-dropdown-background, var(--vscode-editor-background));
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .dropdown-header {
    background: var(--vscode-sideBar-background);
  }
</style>
