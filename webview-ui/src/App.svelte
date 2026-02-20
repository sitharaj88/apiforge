<script lang="ts">
  import { onMount } from 'svelte';
  import RequestBuilder from './components/request/RequestBuilder.svelte';
  import ResponseViewer from './components/response/ResponseViewer.svelte';
  import Sidebar from './components/sidebar/Sidebar.svelte';
  import SaveRequestModal from './components/shared/SaveRequestModal.svelte';
  import EnvironmentEditorModal from './components/shared/EnvironmentEditorModal.svelte';
  import Toast from './components/shared/Toast.svelte';
  import ImportModal from './components/shared/ImportModal.svelte';
  import ExportModal from './components/shared/ExportModal.svelte';
  import TestRunnerModal from './components/shared/TestRunnerModal.svelte';
  import { response, isLoading, activeRequest, collections, environments, activeEnvironmentId, history, activeRequestSourceCollection } from './lib/stores';
  import { vscode } from './lib/vscode-api';

  let generatedCode = '';
  let assertionResults: any[] = [];
  let showSaveModal = false;
  let showEnvEditor = false;
  let showImportModal = false;
  let showExportModal = false;
  let showTestRunner = false;
  let editingEnvironment: any = null;
  let selectedLanguage = 'curl';
  let showEnvDropdown = false;

  // Get active environment name
  $: activeEnvironment = $environments.find(e => e.id === $activeEnvironmentId);

  function selectEnvironmentFromHeader(id: string | null) {
    vscode.postMessage({ type: 'setActiveEnvironment', payload: { id } });
    showEnvDropdown = false;
  }

  function editActiveEnvironment() {
    if (activeEnvironment) {
      editingEnvironment = activeEnvironment;
      showEnvEditor = true;
      showEnvDropdown = false;
    }
  }

  // Handle messages from the extension
  onMount(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'generatedCode':
          generatedCode = message.payload.code;
          break;
        case 'response':
          response.set(message.payload);
          isLoading.set(false);
          break;
        case 'error':
          isLoading.set(false);
          break;
        case 'collections':
          collections.set(message.payload.collections);
          break;
        case 'environments':
          environments.set(message.payload.environments);
          if (message.payload.active) {
            activeEnvironmentId.set(message.payload.active);
          }
          break;
        case 'history':
          history.set(message.payload.history);
          break;
        case 'collectionCreated':
          // If modal is open, save the request to the newly created collection
          if (showSaveModal && message.payload?.collection?.id) {
            vscode.postMessage({
              type: 'saveRequestToCollection',
              payload: {
                collectionId: message.payload.collection.id,
                request: $activeRequest
              }
            });
          }
          showSaveModal = false;
          break;
        case 'requestSaved':
          showSaveModal = false;
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Listen for language change events from CodeGenerator
    const handleGenerateCode = (event: CustomEvent) => {
      selectedLanguage = event.detail;
      vscode.postMessage({
        type: 'generateCode',
        payload: {
          request: $activeRequest,
          language: selectedLanguage
        }
      });
    };

    window.addEventListener('generateCode', handleGenerateCode as EventListener);

    // Load initial data
    vscode.postMessage({ type: 'loadCollections' });
    vscode.postMessage({ type: 'loadEnvironments' });
    vscode.postMessage({ type: 'loadHistory' });

    // Generate initial code with cURL
    vscode.postMessage({
      type: 'generateCode',
      payload: {
        request: $activeRequest,
        language: 'curl'
      }
    });

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('generateCode', handleGenerateCode as EventListener);
    };
  });

  // Regenerate code when request changes
  $: if ($activeRequest) {
    vscode.postMessage({
      type: 'generateCode',
      payload: {
        request: $activeRequest,
        language: selectedLanguage
      }
    });
  }

  // Sidebar event handlers
  function handleCreateCollection(e: CustomEvent<{ name: string }>) {
    vscode.postMessage({ type: 'createCollection', payload: { name: e.detail.name } });
  }

  function handleDeleteCollection(e: CustomEvent<{ id: string }>) {
    vscode.postMessage({ type: 'deleteCollection', payload: { id: e.detail.id } });
  }

  function handleSelectRequest(e: CustomEvent<{ request: any; collectionId?: string }>) {
    activeRequest.set(e.detail.request);
    activeRequestSourceCollection.set(e.detail.collectionId || null);
    response.set(null);
  }

  function handleDeleteRequest(e: CustomEvent<{ collectionId: string; requestId: string }>) {
    vscode.postMessage({ type: 'deleteRequest', payload: e.detail });
  }

  function handleCreateEnvironment(e: CustomEvent<{ name: string }>) {
    vscode.postMessage({ type: 'createEnvironment', payload: { name: e.detail.name } });
  }

  function handleSelectEnvironment(e: CustomEvent<{ id: string }>) {
    vscode.postMessage({ type: 'setActiveEnvironment', payload: { id: e.detail.id } });
  }

  function handleDeleteEnvironment(e: CustomEvent<{ id: string }>) {
    vscode.postMessage({ type: 'deleteEnvironment', payload: { id: e.detail.id } });
  }

  function handleEditEnvironment(e: CustomEvent<{ environment: any }>) {
    editingEnvironment = e.detail.environment;
    showEnvEditor = true;
  }

  function handleSaveEnvironment(e: CustomEvent<any>) {
    const updatedEnv = e.detail;
    vscode.postMessage({ type: 'saveEnvironment', payload: updatedEnv });
    showEnvEditor = false;
    editingEnvironment = null;
  }

  function handleSelectHistory(e: CustomEvent<{ entry: any }>) {
    activeRequest.set(e.detail.entry.request);
    if (e.detail.entry.response) {
      response.set(e.detail.entry.response);
    } else {
      response.set(null);
    }
  }

  function handleDeleteHistory(e: CustomEvent<{ id: string }>) {
    vscode.postMessage({ type: 'deleteHistoryEntry', payload: { id: e.detail.id } });
  }

  function handleClearHistory() {
    vscode.postMessage({ type: 'clearHistory' });
  }

  function handleSaveRequest() {
    showSaveModal = true;
  }

  function handleSaveToCollection(e: CustomEvent<{ collectionId: string; folderId?: string }>) {
    vscode.postMessage({
      type: 'saveRequestToCollection',
      payload: {
        collectionId: e.detail.collectionId,
        folderId: e.detail.folderId,
        request: $activeRequest
      }
    });
  }

  function handleCreateAndSave(e: CustomEvent<{ name: string }>) {
    // First create the collection, then the backend will return the collection
    // and we'll save the request to it
    vscode.postMessage({
      type: 'createCollection',
      payload: { name: e.detail.name }
    });
    // The requestSaved/collectionCreated message will close the modal
    // We'll save the request when we receive the collectionCreated message
  }
</script>

<main class="h-screen flex flex-col overflow-hidden bg-vscode-background text-vscode-foreground">
  <!-- Header -->
  <header class="flex items-center justify-between px-6 py-3 border-b border-vscode-border bg-vscode-editor-background/80 backdrop-blur-md sticky top-0 z-10">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
        <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h1 class="text-lg font-bold text-gradient tracking-tight">APIForge</h1>
    </div>
    <div class="flex items-center gap-3">
      <!-- Environment Selector -->
      <div class="relative">
        <button
          class="env-selector flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-all"
          class:env-active={activeEnvironment}
          on:click={() => showEnvDropdown = !showEnvDropdown}
          title={activeEnvironment ? `Active: ${activeEnvironment.name}` : 'No Environment'}
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="max-w-[100px] truncate">{activeEnvironment?.name || 'No Environment'}</span>
          <svg class="w-3 h-3" style="opacity: 0.6;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {#if showEnvDropdown}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div class="env-dropdown absolute right-0 top-full mt-1 w-56 z-50 rounded-lg overflow-hidden shadow-xl">
            <div class="px-3 py-2 border-b border-white/10">
              <span class="text-xs font-semibold uppercase tracking-wider" style="opacity: 0.5;">Environment</span>
            </div>

            <!-- No Environment Option -->
            <button
              class="env-option flex items-center gap-2 w-full px-3 py-2 text-left text-sm"
              class:env-option-selected={!$activeEnvironmentId}
              on:click={() => selectEnvironmentFromHeader(null)}
            >
              <svg class="w-4 h-4" style="opacity: 0.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span>No Environment</span>
              {#if !$activeEnvironmentId}
                <svg class="w-4 h-4 ml-auto text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              {/if}
            </button>

            {#if $environments.length > 0}
              <div class="border-t border-white/10">
                {#each $environments as env (env.id)}
                  <button
                    class="env-option flex items-center gap-2 w-full px-3 py-2 text-left text-sm group"
                    class:env-option-selected={$activeEnvironmentId === env.id}
                    on:click={() => selectEnvironmentFromHeader(env.id)}
                  >
                    <svg class="w-4 h-4 {$activeEnvironmentId === env.id ? 'text-green-400' : ''}" style={$activeEnvironmentId !== env.id ? 'opacity: 0.5;' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span class="flex-1 truncate">{env.name}</span>
                    <span class="text-xs" style="opacity: 0.4;">{env.variables.filter(v => v.enabled && v.key).length} vars</span>
                    {#if $activeEnvironmentId === env.id}
                      <svg class="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}

            <!-- Edit Active Environment -->
            {#if activeEnvironment}
              <div class="border-t border-white/10">
                <button
                  class="env-option flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-vscode-link"
                  on:click={editActiveEnvironment}
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit "{activeEnvironment.name}"</span>
                </button>
              </div>
            {/if}
          </div>

          <!-- Backdrop to close dropdown -->
          <div
            class="fixed inset-0 z-40"
            on:click={() => showEnvDropdown = false}
          ></div>
        {/if}
      </div>

      <!-- Test Runner Button -->
      <button
        class="test-btn flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all"
        on:click={() => showTestRunner = true}
        title="Run all tests in a collection"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Tests
      </button>

      <!-- Import Button -->
      <button
        class="header-btn flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all"
        on:click={() => showImportModal = true}
        title="Import from cURL, Postman, OpenAPI, or HAR"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Import
      </button>

      <!-- Export Button -->
      <button
        class="header-btn flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all"
        on:click={() => showExportModal = true}
        title="Export collection to OpenAPI, Postman, or Markdown"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>

      <!-- Save Request Button -->
      <button
        class="save-btn flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all"
        on:click={handleSaveRequest}
        title="Save Request to Collection"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        Save
      </button>
      <span class="text-xs text-vscode-foreground/50">v0.1.0</span>
    </div>
  </header>

  <!-- Main Content -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Sidebar -->
    <Sidebar
      collections={$collections}
      environments={$environments}
      activeEnvironmentId={$activeEnvironmentId}
      history={$history}
      on:createCollection={handleCreateCollection}
      on:deleteCollection={handleDeleteCollection}
      on:selectRequest={handleSelectRequest}
      on:deleteRequest={handleDeleteRequest}
      on:createEnvironment={handleCreateEnvironment}
      on:selectEnvironment={handleSelectEnvironment}
      on:deleteEnvironment={handleDeleteEnvironment}
      on:editEnvironment={handleEditEnvironment}
      on:selectHistory={handleSelectHistory}
      on:deleteHistory={handleDeleteHistory}
      on:clearHistory={handleClearHistory}
    />

    <!-- Request/Response Panels -->
    <div class="flex-1 flex flex-col lg:flex-row overflow-hidden">
      <!-- Request Panel -->
      <div class="flex-1 flex flex-col min-h-0 lg:min-w-[400px] lg:max-w-[60%] border-b lg:border-b-0 lg:border-r border-vscode-border">
        <RequestBuilder on:save={handleSaveRequest} />
      </div>

      <!-- Response Panel -->
      <div class="flex-1 flex flex-col min-h-0 lg:min-w-[400px]">
        {#if $isLoading}
          <div class="flex-1 flex items-center justify-center">
            <div class="flex flex-col items-center gap-3">
              <div class="w-8 h-8 border-2 border-vscode-focus-border border-t-transparent rounded-full animate-spin"></div>
              <span class="text-sm text-vscode-foreground" style="opacity: 0.7;">Sending request...</span>
            </div>
          </div>
        {:else}
          <ResponseViewer {generatedCode} {assertionResults} />
        {/if}
      </div>
    </div>
  </div>
</main>

<!-- Save Request Modal -->
{#if showSaveModal}
  <SaveRequestModal
    collections={$collections}
    on:save={handleSaveToCollection}
    on:createAndSave={handleCreateAndSave}
    on:close={() => showSaveModal = false}
  />
{/if}

<!-- Environment Editor Modal -->
{#if showEnvEditor && editingEnvironment}
  <EnvironmentEditorModal
    environment={editingEnvironment}
    on:save={handleSaveEnvironment}
    on:close={() => { showEnvEditor = false; editingEnvironment = null; }}
  />
{/if}

<!-- Import Modal -->
<ImportModal
  isOpen={showImportModal}
  onClose={() => showImportModal = false}
/>

<!-- Export Modal -->
<ExportModal
  isOpen={showExportModal}
  onClose={() => showExportModal = false}
/>

<!-- Test Runner Modal -->
<TestRunnerModal
  isOpen={showTestRunner}
  onClose={() => showTestRunner = false}
/>

<Toast />

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  /* Environment Selector Styles */
  .env-selector {
    background: var(--bg-glass);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    backdrop-filter: blur(8px);
  }

  .env-selector:hover {
    background: var(--bg-hover);
    border-color: var(--border-strong);
    color: var(--text-primary);
  }

  .env-selector.env-active {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
    border-color: rgba(16, 185, 129, 0.3);
    color: #34d399;
    font-weight: 600;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
  }

  .env-selector.env-active:hover {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
    border-color: rgba(16, 185, 129, 0.4);
    color: #6ee7b7;
  }

  .env-dropdown {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    box-shadow: var(--shadow-lg);
    backdrop-filter: blur(16px);
  }

  .env-option {
    color: var(--text-secondary);
    transition: all 0.2s ease;
  }

  .env-option:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .env-option-selected {
    background: linear-gradient(90deg, rgba(16, 185, 129, 0.1), transparent);
    color: #34d399;
    border-left: 2px solid #10b981;
  }

  .env-option-selected:hover {
    background: linear-gradient(90deg, rgba(16, 185, 129, 0.15), transparent);
  }

  /* Header Button Styles */
  .header-btn {
    background: var(--bg-glass);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    backdrop-filter: blur(8px);
  }

  .header-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-strong);
    color: var(--text-primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .save-btn {
    background: linear-gradient(135deg, #10b981, #059669);
    border: 1px solid rgba(255,255,255,0.1);
    color: #ffffff;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
  }

  .save-btn:hover {
    background: linear-gradient(135deg, #059669, #047857);
    box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
    transform: translateY(-1px);
  }

  .test-btn {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    border: 1px solid rgba(255,255,255,0.1);
    color: #ffffff;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
  }

  .test-btn:hover {
    background: linear-gradient(135deg, #d97706, #b45309);
    box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
    transform: translateY(-1px);
  }
</style>
