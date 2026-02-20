<script lang="ts" context="module">
  import { writable } from 'svelte/store';

  export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }

  const toasts = writable<ToastMessage[]>([]);

  export function showToast(
    message: string,
    type: ToastMessage['type'] = 'info',
    duration = 3000
  ) {
    const id = Math.random().toString(36).substring(2, 11);
    toasts.update((t) => [...t, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }

  export function dismissToast(id: string) {
    toasts.update((t) => t.filter((toast) => toast.id !== id));
  }

  export { toasts };
</script>

<script lang="ts">
  const icons = {
    success: `<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />`,
    error: `<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />`,
    warning: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />`,
    info: `<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`
  };

  const colors = {
    success: 'bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]',
    error: 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
  };
</script>

<div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
  {#each $toasts as toast (toast.id)}
    <div
      class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl pointer-events-auto min-w-[280px] max-w-md animate-slide-in {colors[toast.type]} ring-1 ring-white/5"
      role="alert"
    >
      <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        {@html icons[toast.type]}
      </svg>
      <p class="flex-1 text-sm font-medium text-vscode-foreground">{toast.message}</p>
      <button
        class="flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors"
        on:click={() => dismissToast(toast.id)}
        aria-label="Dismiss"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>

<style>
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
</style>
