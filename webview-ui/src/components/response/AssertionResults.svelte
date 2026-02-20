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

<div class="flex flex-col h-full">
  <!-- Summary Header -->
  <div class="flex items-center justify-between px-4 py-2 border-b border-vscode-border bg-vscode-sidebar-bg">
    <div class="flex items-center gap-3">
      {#if results.length > 0}
        <div class="flex items-center gap-1">
          {#if allPassed}
            <svg class="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium text-green-400">All Passed</span>
          {:else}
            <svg class="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium text-red-400">{failedCount} Failed</span>
          {/if}
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-2 text-xs text-vscode-foreground" style="opacity: 0.6;">
      <span class="text-green-400">{passedCount} passed</span>
      <span>/</span>
      <span class="text-red-400">{failedCount} failed</span>
      <span>/</span>
      <span>{results.length} total</span>
    </div>
  </div>

  <!-- Results List -->
  <div class="flex-1 overflow-auto">
    {#if results.length === 0}
      <div class="flex flex-col items-center justify-center h-full p-4 text-center text-vscode-foreground" style="opacity: 0.5;">
        <svg class="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p class="text-sm">No assertion results</p>
        <p class="text-xs mt-1">Run a request with assertions to see results</p>
      </div>
    {:else}
      <div class="divide-y divide-vscode-border">
        {#each results as result (result.assertion.id)}
          <div class="px-4 py-3 hover:bg-vscode-list-hover">
            <div class="flex items-start gap-3">
              <!-- Status Icon -->
              <div class="flex-shrink-0 mt-0.5">
                {#if result.passed}
                  <svg class="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                {:else}
                  <svg class="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                {/if}
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-sm {result.passed ? 'text-vscode-foreground' : 'text-red-400'}">
                  {result.message}
                </p>

                {#if result.actual !== undefined && !result.passed}
                  <div class="mt-1 text-xs text-vscode-foreground" style="opacity: 0.6;">
                    <span class="font-medium">Actual:</span>
                    <code class="ml-1 px-1 py-0.5 bg-vscode-input-bg rounded font-mono">
                      {typeof result.actual === 'object' ? JSON.stringify(result.actual) : result.actual}
                    </code>
                  </div>
                {/if}

                {#if result.assertion.expected !== undefined && !result.passed}
                  <div class="mt-1 text-xs text-vscode-foreground" style="opacity: 0.6;">
                    <span class="font-medium">Expected:</span>
                    <code class="ml-1 px-1 py-0.5 bg-vscode-input-bg rounded font-mono">
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
