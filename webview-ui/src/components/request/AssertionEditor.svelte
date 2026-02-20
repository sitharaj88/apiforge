<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { generateId } from '../../lib/stores';

  interface Assertion {
    id: string;
    type: string;
    enabled: boolean;
    target?: string;
    expected?: string | number | boolean;
    comparator?: string;
    min?: number;
    max?: number;
  }

  export let assertions: Assertion[] = [];

  const dispatch = createEventDispatcher<{ change: Assertion[] }>();

  const assertionTypes = [
    { value: 'status', label: 'Status Code', hasTarget: false, hasExpected: true, expectedType: 'number' },
    { value: 'status_range', label: 'Status Code Range', hasTarget: false, hasExpected: false, hasRange: true },
    { value: 'response_time', label: 'Response Time (ms)', hasTarget: false, hasExpected: true, expectedType: 'number' },
    { value: 'header_exists', label: 'Header Exists', hasTarget: true, hasExpected: false, hasComparator: true },
    { value: 'header_equals', label: 'Header Equals', hasTarget: true, hasExpected: true },
    { value: 'header_contains', label: 'Header Contains', hasTarget: true, hasExpected: true },
    { value: 'body_contains', label: 'Body Contains', hasTarget: false, hasExpected: true },
    { value: 'body_not_contains', label: 'Body Not Contains', hasTarget: false, hasExpected: true },
    { value: 'body_matches', label: 'Body Matches Regex', hasTarget: false, hasExpected: true },
    { value: 'jsonpath_exists', label: 'JSONPath Exists', hasTarget: true, targetLabel: 'Path', hasExpected: false, hasComparator: true },
    { value: 'jsonpath_equals', label: 'JSONPath Equals', hasTarget: true, targetLabel: 'Path', hasExpected: true },
    { value: 'jsonpath_contains', label: 'JSONPath Contains', hasTarget: true, targetLabel: 'Path', hasExpected: true },
    { value: 'content_type', label: 'Content-Type', hasTarget: false, hasExpected: true },
    { value: 'json_schema', label: 'JSON Schema', hasTarget: false, hasExpected: true, expectedType: 'json' },
  ];

  function getTypeConfig(type: string) {
    return assertionTypes.find(t => t.value === type) ?? assertionTypes[0];
  }

  function addAssertion() {
    const newAssertion: Assertion = {
      id: generateId(),
      type: 'status',
      enabled: true,
      expected: 200,
    };
    assertions = [...assertions, newAssertion];
    dispatch('change', assertions);
  }

  function updateAssertion(index: number, field: keyof Assertion, value: unknown) {
    const newAssertions = [...assertions];
    newAssertions[index] = { ...newAssertions[index]!, [field]: value };

    // Reset fields when type changes
    if (field === 'type') {
      const config = getTypeConfig(value as string);
      newAssertions[index] = {
        ...newAssertions[index]!,
        target: config.hasTarget ? '' : undefined,
        expected: config.hasExpected ? '' : undefined,
        min: config.hasRange ? 200 : undefined,
        max: config.hasRange ? 299 : undefined,
        comparator: config.hasComparator ? 'exists' : undefined,
      };
    }

    assertions = newAssertions;
    dispatch('change', assertions);
  }

  function removeAssertion(index: number) {
    assertions = assertions.filter((_, i) => i !== index);
    dispatch('change', assertions);
  }

  function toggleAssertion(index: number) {
    updateAssertion(index, 'enabled', !assertions[index]!.enabled);
  }

  function duplicateAssertion(index: number) {
    const assertion = assertions[index]!;
    const newAssertion = { ...assertion, id: generateId() };
    assertions = [...assertions.slice(0, index + 1), newAssertion, ...assertions.slice(index + 1)];
    dispatch('change', assertions);
  }
</script>

<div class="flex flex-col h-full bg-vscode-editor-background/30 backdrop-blur-xl">
  <!-- Header -->
  <div class="flex items-center justify-between px-6 py-3 border-b border-vscode-border/30 bg-vscode-sidebar-bg/40 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
    <span class="text-xs font-semibold text-vscode-foreground/70 uppercase tracking-wider">
      Assertions ({assertions.length})
    </span>
    <button
      class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-api-primary/20 text-api-primary hover:bg-api-primary/30 hover:shadow-[0_0_15px_rgba(var(--api-primary-rgb),0.2)] transition-all duration-200 ring-1 ring-api-primary/30"
      on:click={addAssertion}
    >
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Add
    </button>
  </div>

  <!-- Assertions List -->
  <div class="flex-1 overflow-auto bg-vscode-editor-background/20 p-4">
    {#if assertions.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-vscode-foreground/40">
        <div class="w-16 h-16 mb-4 rounded-full bg-vscode-editor-background/50 border border-vscode-border/30 flex items-center justify-center shadow-inner">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-sm font-medium text-vscode-foreground/60">No assertions defined</p>
        <p class="text-xs mt-1">Add assertions to validate responses</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each assertions as assertion, index (assertion.id)}
          {@const config = getTypeConfig(assertion.type)}
          <div class="group relative rounded-xl border border-vscode-border/20 bg-vscode-editor-background/40 backdrop-blur-sm hover:bg-vscode-editor-background/60 transition-all duration-200 shadow-sm overflow-hidden p-4" class:opacity-50={!assertion.enabled}>
            <div class="flex items-start gap-3">
              <!-- Enable Checkbox -->
              <div class="flex items-center justify-center w-5 h-5 mt-1">
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded border-vscode-border/30 bg-vscode-editor-background/50 text-api-primary focus:ring-api-primary/50 focus:ring-offset-0 transition-all duration-200 cursor-pointer"
                  checked={assertion.enabled}
                  on:change={() => toggleAssertion(index)}
                />
              </div>

              <!-- Assertion Fields -->
              <div class="flex-1 space-y-3">
                <div class="flex items-center gap-3">
                  <!-- Type Select -->
                  <select
                    class="select py-1.5 text-sm flex-1 bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
                    value={assertion.type}
                    on:change={(e) => updateAssertion(index, 'type', e.currentTarget.value)}
                  >
                    {#each assertionTypes as type}
                      <option value={type.value}>{type.label}</option>
                    {/each}
                  </select>

                  <!-- Actions -->
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      class="p-1.5 rounded-md text-vscode-foreground/50 hover:text-vscode-foreground hover:bg-vscode-editor-background/80 transition-all duration-200"
                      on:click={() => duplicateAssertion(index)}
                      title="Duplicate"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      class="p-1.5 rounded-md text-vscode-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                      on:click={() => removeAssertion(index)}
                      title="Remove"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <!-- Comparator (for exists types) -->
                  {#if config.hasComparator}
                    <select
                      class="select py-1.5 text-sm w-32 bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
                      value={assertion.comparator ?? 'exists'}
                      on:change={(e) => updateAssertion(index, 'comparator', e.currentTarget.value)}
                    >
                      <option value="exists">Exists</option>
                      <option value="not_exists">Not Exists</option>
                    </select>
                  {/if}

                  <!-- Target (header name, jsonpath) -->
                  {#if config.hasTarget}
                    <input
                      type="text"
                      class="input py-1.5 text-sm flex-1 bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
                      placeholder={config.targetLabel ?? 'Header Name'}
                      value={assertion.target ?? ''}
                      on:input={(e) => updateAssertion(index, 'target', e.currentTarget.value)}
                    />
                  {/if}

                  <!-- Expected Value -->
                  {#if config.hasExpected}
                    {#if config.expectedType === 'number'}
                      <input
                        type="number"
                        class="input py-1.5 text-sm w-24 bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
                        placeholder="Value"
                        value={assertion.expected ?? ''}
                        on:input={(e) => updateAssertion(index, 'expected', e.currentTarget.valueAsNumber)}
                      />
                    {:else if config.expectedType === 'json'}
                      <input
                        type="text"
                        class="input py-1.5 text-sm flex-1 font-mono bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
                        placeholder={`{"type": "object", ...}`}
                        value={assertion.expected ?? ''}
                        on:input={(e) => updateAssertion(index, 'expected', e.currentTarget.value)}
                      />
                    {:else}
                      <input
                        type="text"
                        class="input py-1.5 text-sm flex-1 bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
                        placeholder="Expected Value"
                        value={assertion.expected ?? ''}
                        on:input={(e) => updateAssertion(index, 'expected', e.currentTarget.value)}
                      />
                    {/if}
                  {/if}

                  <!-- Range (min/max) -->
                  {#if config.hasRange}
                    <input
                      type="number"
                      class="input py-1.5 text-sm w-20 bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
                      placeholder="Min"
                      value={assertion.min ?? 200}
                      on:input={(e) => updateAssertion(index, 'min', e.currentTarget.valueAsNumber)}
                    />
                    <span class="text-vscode-foreground/50 text-sm font-medium">-</span>
                    <input
                      type="number"
                      class="input py-1.5 text-sm w-20 bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
                      placeholder="Max"
                      value={assertion.max ?? 299}
                      on:input={(e) => updateAssertion(index, 'max', e.currentTarget.valueAsNumber)}
                    />
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Help Text -->
  <div class="px-4 py-3 text-xs border-t border-vscode-border/30 bg-vscode-sidebar-bg/40 backdrop-blur-md text-vscode-foreground/60 flex items-center gap-2">
    <svg class="w-4 h-4 text-api-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <p>JSONPath examples: <code class="px-1.5 py-0.5 bg-vscode-editor-background/50 border border-vscode-border/30 rounded-md text-api-primary font-mono">data.id</code>, <code class="px-1.5 py-0.5 bg-vscode-editor-background/50 border border-vscode-border/30 rounded-md text-api-primary font-mono">users[0].name</code>, <code class="px-1.5 py-0.5 bg-vscode-editor-background/50 border border-vscode-border/30 rounded-md text-api-primary font-mono">items.length</code></p>
  </div>
</div>

<style>
</style>
