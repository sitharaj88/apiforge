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

<div class="flex flex-col h-full bg-vscode-editor-background/30 backdrop-blur-md">
  <!-- Modern Toolbar -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-xl shadow-sm">
    <!-- Language Selector Dropdown -->
    <div class="language-dropdown relative">
      <button
        class="flex items-center gap-2 px-3 py-2 rounded-lg bg-vscode-editor-background/50 border border-vscode-border/30 hover:border-api-primary/50 hover:bg-vscode-editor-background/80 transition-all duration-200 shadow-inner"
        on:click|stopPropagation={() => showDropdown = !showDropdown}
      >
        <span class="text-base">{selectedLang?.icon}</span>
        <div class="text-left">
          <div class="text-sm font-medium text-vscode-foreground/90">{selectedLang?.name}</div>
          <div class="text-[10px] font-semibold text-vscode-foreground/50 uppercase tracking-wider">{selectedLang?.category}</div>
        </div>
        <svg class="w-4 h-4 ml-2 text-vscode-foreground/40 transition-transform duration-200 {showDropdown ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {#if showDropdown}
        <div class="dropdown-menu absolute top-full left-0 mt-2 w-80 max-h-96 overflow-auto rounded-xl z-50 border border-vscode-border/30 bg-vscode-editor-background/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {#each categories as category}
            <div class="dropdown-header px-4 py-2 text-[10px] font-bold text-vscode-foreground/50 uppercase tracking-wider sticky top-0 border-b border-vscode-border/20 bg-vscode-editor-background/95 backdrop-blur-md z-10">
              {category}
            </div>
            {#each languages.filter(l => l.category === category) as lang}
              <button
                class="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-all duration-150 {selectedLanguage === lang.id ? 'bg-api-primary/10 text-api-primary' : 'hover:bg-vscode-editor-background/60 text-vscode-foreground/80 hover:text-vscode-foreground'}"
                on:click={() => handleLanguageChange(lang.id)}
              >
                <span class="text-lg w-6 text-center">{lang.icon}</span>
                <span class="text-sm font-medium flex-1">{lang.name}</span>
                {#if selectedLanguage === lang.id}
                  <svg class="w-4 h-4 text-api-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                {/if}
              </button>
            {/each}
          {/each}
        </div>
      {/if}
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-2">
      <button
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 {copied ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'bg-vscode-editor-background/50 text-vscode-foreground/70 hover:text-vscode-foreground hover:bg-vscode-editor-background/80 border border-vscode-border/30 shadow-inner'}"
        on:click={copyCode}
        title="Copy to clipboard"
      >
        {#if copied}
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>Copied!</span>
        {:else}
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy</span>
        {/if}
      </button>
      <button
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-vscode-editor-background/50 text-vscode-foreground/70 hover:text-vscode-foreground hover:bg-vscode-editor-background/80 border border-vscode-border/30 shadow-inner transition-all duration-200"
        on:click={downloadCode}
        title="Download as file"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Download</span>
      </button>
    </div>
  </div>

  <!-- Code Display with Line Numbers -->
  <div class="flex-1 overflow-auto bg-vscode-editor-background/20">
    {#if code}
      <div class="flex text-sm font-mono min-h-full">
        <!-- Line Numbers -->
        <div class="flex-shrink-0 py-4 pr-4 pl-4 text-right select-none border-r border-vscode-border/20 bg-vscode-editor-background/30" style="min-width: 3.5rem;">
          {#each code.split('\n') as _, i}
            <div class="text-vscode-foreground/30 leading-relaxed text-xs">{i + 1}</div>
          {/each}
        </div>
        <!-- Code -->
        <pre class="flex-1 p-4 text-vscode-foreground/90 whitespace-pre-wrap leading-relaxed overflow-x-auto text-xs">{code}</pre>
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center h-full text-vscode-foreground/40">
        <div class="w-16 h-16 mb-4 rounded-full bg-vscode-editor-background/50 border border-vscode-border/30 flex items-center justify-center shadow-inner">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <p class="text-sm font-medium text-vscode-foreground/60">No code generated yet</p>
        <p class="text-xs mt-1">Configure a request to generate code</p>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Custom scrollbar for dropdown */
  .dropdown-menu::-webkit-scrollbar {
    width: 6px;
  }
  .dropdown-menu::-webkit-scrollbar-track {
    background: transparent;
  }
  .dropdown-menu::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-background);
    border-radius: 3px;
  }
  .dropdown-menu::-webkit-scrollbar-thumb:hover {
    background: var(--vscode-scrollbarSlider-hoverBackground);
  }
</style>
