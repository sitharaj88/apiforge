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

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex items-center justify-between px-3 py-2 border-b border-vscode-border bg-vscode-sidebar-bg">
    <span class="text-sm font-medium text-vscode-foreground">
      Assertions ({assertions.length})
    </span>
    <button
      class="btn btn-sm"
      on:click={addAssertion}
    >
      <svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Add
    </button>
  </div>

  <!-- Assertions List -->
  <div class="flex-1 overflow-auto">
    {#if assertions.length === 0}
      <div class="flex flex-col items-center justify-center h-full p-4 text-center text-vscode-foreground" style="opacity: 0.5;">
        <svg class="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm">No assertions defined</p>
        <p class="text-xs mt-1">Add assertions to validate responses</p>
      </div>
    {:else}
      <div class="divide-y divide-vscode-border">
        {#each assertions as assertion, index (assertion.id)}
          {@const config = getTypeConfig(assertion.type)}
          <div class="group p-3 hover:bg-vscode-list-hover" class:opacity-50={!assertion.enabled}>
            <div class="flex items-start gap-2">
              <!-- Enable Checkbox -->
              <input
                type="checkbox"
                class="mt-1 w-4 h-4 accent-vscode-focus-border"
                checked={assertion.enabled}
                on:change={() => toggleAssertion(index)}
              />

              <!-- Assertion Fields -->
              <div class="flex-1 space-y-2">
                <div class="flex items-center gap-2">
                  <!-- Type Select -->
                  <select
                    class="input py-1 text-sm flex-1"
                    value={assertion.type}
                    on:change={(e) => updateAssertion(index, 'type', e.currentTarget.value)}
                  >
                    {#each assertionTypes as type}
                      <option value={type.value}>{type.label}</option>
                    {/each}
                  </select>

                  <!-- Actions -->
                  <button
                    class="btn-icon opacity-0 group-hover:opacity-100 text-vscode-foreground"
                    on:click={() => duplicateAssertion(index)}
                    title="Duplicate"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    class="btn-icon opacity-0 group-hover:opacity-100 text-vscode-foreground hover:text-red-400"
                    on:click={() => removeAssertion(index)}
                    title="Remove"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <!-- Comparator (for exists types) -->
                  {#if config.hasComparator}
                    <select
                      class="input py-1 text-sm w-32"
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
                      class="input py-1 text-sm flex-1"
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
                        class="input py-1 text-sm w-24"
                        placeholder="Value"
                        value={assertion.expected ?? ''}
                        on:input={(e) => updateAssertion(index, 'expected', e.currentTarget.valueAsNumber)}
                      />
                    {:else if config.expectedType === 'json'}
                      <input
                        type="text"
                        class="input py-1 text-sm flex-1 font-mono"
                        placeholder={`{"type": "object", ...}`}
                        value={assertion.expected ?? ''}
                        on:input={(e) => updateAssertion(index, 'expected', e.currentTarget.value)}
                      />
                    {:else}
                      <input
                        type="text"
                        class="input py-1 text-sm flex-1"
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
                      class="input py-1 text-sm w-20"
                      placeholder="Min"
                      value={assertion.min ?? 200}
                      on:input={(e) => updateAssertion(index, 'min', e.currentTarget.valueAsNumber)}
                    />
                    <span class="text-vscode-foreground text-sm">-</span>
                    <input
                      type="number"
                      class="input py-1 text-sm w-20"
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
  <div class="px-3 py-2 text-xs border-t border-vscode-border bg-vscode-sidebar-bg text-vscode-foreground" style="opacity: 0.6;">
    <p>JSONPath examples: <code class="px-1 py-0.5 bg-vscode-input-bg rounded">data.id</code>, <code class="px-1 py-0.5 bg-vscode-input-bg rounded">users[0].name</code>, <code class="px-1 py-0.5 bg-vscode-input-bg rounded">items.length</code></p>
  </div>
</div>

<style>
  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
</style>
