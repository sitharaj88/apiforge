<script lang="ts">
  interface AssertionResult {
    assertion: {
      id: string;
      type: string;
      target?: string;
      expected?: unknown;
    };
    passed: boolean;
    actual?: unknown;
    message: string;
  }

  export let results: AssertionResult[] = [];

  $: passedCount = results.filter(r => r.passed).length;
  $: failedCount = results.filter(r => !r.passed).length;
  $: allPassed = failedCount === 0 && results.length > 0;
</script>

<div class="flex flex-col h-full bg-vscode-editor-background/30 backdrop-blur-md">
  <!-- Summary Header -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-xl shadow-sm">
    <div class="flex items-center gap-3">
      {#if results.length > 0}
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-vscode-editor-background/50 border border-vscode-border/30 shadow-inner">
          {#if allPassed}
            <div class="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <span class="text-sm font-semibold text-green-400 tracking-wide">All Passed</span>
          {:else}
            <div class="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.2)]">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span class="text-sm font-semibold text-red-400 tracking-wide">{failedCount} Failed</span>
          {/if}
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-vscode-editor-background/50 border border-vscode-border/30 shadow-inner text-xs font-medium">
      <span class="text-green-400 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>{passedCount} passed</span>
      <div class="w-px h-3 bg-vscode-border/50"></div>
      <span class="text-red-400 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>{failedCount} failed</span>
      <div class="w-px h-3 bg-vscode-border/50"></div>
      <span class="text-vscode-foreground/60">{results.length} total</span>
    </div>
  </div>

  <!-- Results List -->
  <div class="flex-1 overflow-auto bg-vscode-editor-background/20 p-4">
    {#if results.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-vscode-foreground/40">
        <div class="w-16 h-16 mb-4 rounded-full bg-vscode-editor-background/50 border border-vscode-border/30 flex items-center justify-center shadow-inner">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <p class="text-sm font-medium text-vscode-foreground/60">No assertion results</p>
        <p class="text-xs mt-1">Run a request with assertions to see results</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each results as result (result.assertion.id)}
          <div class="group relative rounded-xl border {result.passed ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'} backdrop-blur-sm hover:bg-vscode-editor-background/60 transition-all duration-200 shadow-sm overflow-hidden p-4">
            <div class="flex items-start gap-3">
              <!-- Status Icon -->
              <div class="flex-shrink-0 mt-0.5">
                {#if result.passed}
                  <div class="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                {:else}
                  <div class="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.2)]">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                {/if}
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium {result.passed ? 'text-vscode-foreground/90' : 'text-red-400'} leading-relaxed">
                  {result.message}
                </p>

                {#if result.actual !== undefined && !result.passed}
                  <div class="mt-3 flex items-center gap-2 text-xs">
                    <span class="font-semibold text-vscode-foreground/50 uppercase tracking-wider w-16">Actual:</span>
                    <code class="px-2 py-1 bg-vscode-editor-background/80 border border-vscode-border/30 rounded-md font-mono text-vscode-foreground/80 shadow-inner break-all">
                      {typeof result.actual === 'object' ? JSON.stringify(result.actual) : result.actual}
                    </code>
                  </div>
                {/if}

                {#if result.assertion.expected !== undefined && !result.passed}
                  <div class="mt-2 flex items-center gap-2 text-xs">
                    <span class="font-semibold text-vscode-foreground/50 uppercase tracking-wider w-16">Expected:</span>
                    <code class="px-2 py-1 bg-vscode-editor-background/80 border border-vscode-border/30 rounded-md font-mono text-vscode-foreground/80 shadow-inner break-all">
                      {typeof result.assertion.expected === 'object' ? JSON.stringify(result.assertion.expected) : result.assertion.expected}
                    </code>
                  </div>
                {/if}
              </div>

              <!-- Type Badge -->
              <span class="flex-shrink-0 px-2 py-0.5 text-xs rounded bg-vscode-badge-bg text-vscode-badge-fg">
                {result.assertion.type.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Progress Bar -->
  {#if results.length > 0}
    <div class="h-1 bg-vscode-sidebar-bg">
      <div
        class="h-full transition-all duration-300 {allPassed ? 'bg-green-500' : 'bg-red-500'}"
        style="width: {(passedCount / results.length) * 100}%"
      ></div>
    </div>
  {/if}
</div>
