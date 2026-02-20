<script lang="ts">
  import { collections, activeEnvironmentId } from '../../lib/stores';
  import { vscode } from '../../lib/vscode-api';

  export let isOpen = false;
  export let onClose: () => void = () => {};

  interface TestResult {
    requestId: string;
    requestName: string;
    status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
    duration?: number;
    statusCode?: number;
    assertions: {
      name: string;
      passed: boolean;
      message?: string;
    }[];
    error?: string;
  }

  let selectedCollection: string = '';
  let isRunning = false;
  let testResults: TestResult[] = [];
  let currentRequestIndex = 0;
  let totalRequests = 0;

  $: collectionList = $collections;
  $: if (collectionList.length > 0 && !selectedCollection) {
    selectedCollection = collectionList[0].id;
  }

  $: selectedCollectionData = collectionList.find(c => c.id === selectedCollection);
  $: requestsWithAssertions = selectedCollectionData?.requests.filter(r => r.assertions && r.assertions.length > 0) || [];

  $: passedTests = testResults.filter(r => r.status === 'passed').length;
  $: failedTests = testResults.filter(r => r.status === 'failed' || r.status === 'error').length;
  $: totalAssertions = testResults.reduce((acc, r) => acc + r.assertions.length, 0);
  $: passedAssertions = testResults.reduce((acc, r) => acc + r.assertions.filter(a => a.passed).length, 0);

  function handleClose() {
    if (!isRunning) {
      testResults = [];
      onClose();
    }
  }

  async function runTests() {
    if (!selectedCollectionData || requestsWithAssertions.length === 0) return;

    isRunning = true;
    testResults = requestsWithAssertions.map(r => ({
      requestId: r.id,
      requestName: r.name,
      status: 'pending' as const,
      assertions: [],
    }));
    currentRequestIndex = 0;
    totalRequests = requestsWithAssertions.length;

    // Send message to run tests
    vscode.postMessage({
      type: 'runCollectionTests',
      payload: {
        collectionId: selectedCollection,
        environmentId: $activeEnvironmentId || undefined,
      },
    });
  }

  function stopTests() {
    vscode.postMessage({ type: 'stopCollectionTests' });
    isRunning = false;
  }

  // Listen for test results
  function handleMessage(event: MessageEvent) {
    const message = event.data;

    if (message.type === 'testProgress') {
      const { requestId, status, duration, statusCode, assertions, error } = message.payload;
      testResults = testResults.map(r => {
        if (r.requestId === requestId) {
          return { ...r, status, duration, statusCode, assertions: assertions || [], error };
        }
        return r;
      });
      currentRequestIndex = testResults.filter(r => r.status !== 'pending').length;
    }

    if (message.type === 'testComplete') {
      isRunning = false;
    }
  }

  $: if (isOpen) {
    window.addEventListener('message', handleMessage);
  } else {
    window.removeEventListener('message', handleMessage);
  }
</script>

{#if isOpen}
  <div
    class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
    on:click|self={handleClose}
    on:keydown={(e) => e.key === 'Escape' && !isRunning && handleClose()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <div class="modal-content w-full max-w-3xl max-h-[85vh] flex flex-col">
      <!-- Header -->
      <div class="modal-header flex items-center justify-between px-6 py-5 flex-shrink-0">
        <div class="flex items-center gap-4">
          <div class="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-600/20 ring-1 ring-orange-500/20">
            <svg class="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h2 id="modal-title" class="text-base font-semibold text-vscode-foreground">Test Runner</h2>
            <p class="text-xs text-orange-400/70">Run all assertions in a collection</p>
          </div>
        </div>
        <button
          class="p-2 rounded-lg hover:bg-white/5 text-vscode-foreground/60 hover:text-vscode-foreground transition-all"
          class:opacity-50={isRunning}
          class:cursor-not-allowed={isRunning}
          on:click={handleClose}
          disabled={isRunning}
          aria-label="Close"
          type="button"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-5 flex-1 overflow-auto">
        {#if testResults.length === 0}
          <!-- Collection Selector -->
          <div class="mb-5">
            <label for="collection-select" class="block text-xs font-medium text-vscode-foreground/60 uppercase tracking-wider mb-3">
              Select Collection
            </label>
            <select
              id="collection-select"
              class="input-modern w-full"
              bind:value={selectedCollection}
              disabled={isRunning}
            >
              {#each collectionList as collection}
                <option value={collection.id}>
                  {collection.name} ({collection.requests.filter(r => r.assertions && r.assertions.length > 0).length} requests with assertions)
                </option>
              {/each}
            </select>
          </div>

          <!-- Info -->
          {#if requestsWithAssertions.length === 0}
            <div class="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm flex items-start gap-3">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>No requests with assertions found in this collection. Add assertions to requests to run tests.</span>
            </div>
          {:else}
            <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-sm text-vscode-foreground/70">
              <p class="flex items-center gap-2">
                <svg class="w-4 h-4 text-orange-400/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Ready to run <strong>{requestsWithAssertions.length}</strong> requests with assertions</span>
              </p>
            </div>
          {/if}
        {:else}
          <!-- Progress -->
          {#if isRunning}
            <div class="mb-5">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-vscode-foreground/70">Running tests...</span>
                <span class="text-xs text-vscode-foreground/50">{currentRequestIndex}/{totalRequests}</span>
              </div>
              <div class="progress-bar h-2 rounded-full overflow-hidden">
                <div
                  class="progress-fill h-full transition-all duration-300"
                  style="width: {(currentRequestIndex / totalRequests) * 100}%"
                ></div>
              </div>
            </div>
          {/if}

          <!-- Summary -->
          <div class="grid grid-cols-4 gap-3 mb-5">
            <div class="stat-card p-3 rounded-xl">
              <div class="text-2xl font-bold text-vscode-foreground">{testResults.length}</div>
              <div class="text-xs text-vscode-foreground/50">Total</div>
            </div>
            <div class="stat-card stat-passed p-3 rounded-xl">
              <div class="text-2xl font-bold text-green-400">{passedTests}</div>
              <div class="text-xs text-green-400/70">Passed</div>
            </div>
            <div class="stat-card stat-failed p-3 rounded-xl">
              <div class="text-2xl font-bold text-red-400">{failedTests}</div>
              <div class="text-xs text-red-400/70">Failed</div>
            </div>
            <div class="stat-card p-3 rounded-xl">
              <div class="text-2xl font-bold text-blue-400">{passedAssertions}/{totalAssertions}</div>
              <div class="text-xs text-blue-400/70">Assertions</div>
            </div>
          </div>

          <!-- Results -->
          <div class="space-y-2">
            {#each testResults as result (result.requestId)}
              <div class="result-card p-4 rounded-xl">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-3">
                    {#if result.status === 'pending'}
                      <div class="w-5 h-5 rounded-full bg-white/10"></div>
                    {:else if result.status === 'running'}
                      <svg class="w-5 h-5 text-blue-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    {:else if result.status === 'passed'}
                      <svg class="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    {:else}
                      <svg class="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    {/if}
                    <span class="font-medium text-vscode-foreground">{result.requestName}</span>
                  </div>
                  <div class="flex items-center gap-3 text-xs">
                    {#if result.statusCode}
                      <span class="px-2 py-0.5 rounded {result.statusCode < 400 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                        {result.statusCode}
                      </span>
                    {/if}
                    {#if result.duration}
                      <span class="text-vscode-foreground/50">{result.duration}ms</span>
                    {/if}
                  </div>
                </div>

                {#if result.error}
                  <div class="text-xs text-red-400 mt-2 p-2 rounded bg-red-500/10">
                    {result.error}
                  </div>
                {/if}

                {#if result.assertions.length > 0}
                  <div class="mt-2 space-y-1">
                    {#each result.assertions as assertion}
                      <div class="flex items-center gap-2 text-xs">
                        {#if assertion.passed}
                          <svg class="w-3.5 h-3.5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        {:else}
                          <svg class="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        {/if}
                        <span class={assertion.passed ? 'text-vscode-foreground/70' : 'text-red-400'}>
                          {assertion.name}
                          {#if assertion.message && !assertion.passed}
                            - {assertion.message}
                          {/if}
                        </span>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="modal-footer flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div class="text-xs text-vscode-foreground/50">
          {#if testResults.length > 0 && !isRunning}
            Test run completed
          {:else if isRunning}
            Running tests...
          {:else}
            {requestsWithAssertions.length} requests ready to test
          {/if}
        </div>
        <div class="flex items-center gap-3">
          {#if testResults.length > 0 && !isRunning}
            <button
              class="px-5 py-2.5 text-sm font-medium rounded-xl text-vscode-foreground/70 hover:text-vscode-foreground hover:bg-white/5 transition-all"
              on:click={() => testResults = []}
              type="button"
            >
              Run Again
            </button>
          {/if}
          <button
            class="px-5 py-2.5 text-sm font-medium rounded-xl text-vscode-foreground/70 hover:text-vscode-foreground hover:bg-white/5 transition-all"
            class:opacity-50={isRunning}
            class:cursor-not-allowed={isRunning}
            on:click={handleClose}
            disabled={isRunning}
            type="button"
          >
            {testResults.length > 0 ? 'Close' : 'Cancel'}
          </button>
          {#if testResults.length === 0}
            <button
              class="btn-run px-6 py-2.5 text-sm font-medium rounded-xl transition-all flex items-center gap-2"
              on:click={runTests}
              disabled={requestsWithAssertions.length === 0 || isRunning}
              type="button"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run Tests
            </button>
          {:else if isRunning}
            <button
              class="btn-stop px-6 py-2.5 text-sm font-medium rounded-xl transition-all flex items-center gap-2"
              on:click={stopTests}
              type="button"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Stop
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
  }

  .modal-content {
    background: var(--vscode-editor-background);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.3),
      0 25px 50px -12px rgba(0, 0, 0, 0.6),
      0 0 80px -20px rgba(249, 115, 22, 0.15);
    overflow: hidden;
  }

  .modal-header {
    background: linear-gradient(180deg, rgba(249, 115, 22, 0.08) 0%, transparent 100%);
    border-bottom: 1px solid rgba(249, 115, 22, 0.15);
  }

  .modal-footer {
    background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.15) 100%);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .input-modern {
    padding: 12px 16px;
    font-size: 14px;
    background: var(--vscode-input-background, rgba(30, 30, 30, 0.8));
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: var(--vscode-input-foreground, var(--vscode-foreground));
    transition: all 0.2s ease;
  }

  .input-modern:focus {
    outline: none;
    border-color: rgba(249, 115, 22, 0.5);
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
  }

  .btn-run {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    color: white;
    font-weight: 500;
    border: none;
    box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
  }

  .btn-run:hover:not(:disabled) {
    background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(249, 115, 22, 0.4);
  }

  .btn-run:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-stop {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    font-weight: 500;
    border: none;
  }

  .btn-stop:hover {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  }

  .progress-bar {
    background: rgba(255, 255, 255, 0.1);
  }

  .progress-fill {
    background: linear-gradient(90deg, #f97316, #ea580c);
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .stat-passed {
    background: rgba(34, 197, 94, 0.05);
    border-color: rgba(34, 197, 94, 0.1);
  }

  .stat-failed {
    background: rgba(239, 68, 68, 0.05);
    border-color: rgba(239, 68, 68, 0.1);
  }

  .result-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
