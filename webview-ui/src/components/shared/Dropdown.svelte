<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  interface DropdownItem {
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
    divider?: boolean;
  }

  export let items: DropdownItem[] = [];
  export let trigger: 'click' | 'hover' = 'click';
  export let position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' = 'bottom-left';
  export let closeOnSelect = true;

  const dispatch = createEventDispatcher<{ select: DropdownItem }>();

  let open = false;
  let dropdownEl: HTMLDivElement;

  const positionClasses = {
    'bottom-left': 'top-full left-0 mt-1',
    'bottom-right': 'top-full right-0 mt-1',
    'top-left': 'bottom-full left-0 mb-1',
    'top-right': 'bottom-full right-0 mb-1'
  };

  function toggle() {
    if (trigger === 'click') {
      open = !open;
    }
  }

  function handleMouseEnter() {
    if (trigger === 'hover') {
      open = true;
    }
  }

  function handleMouseLeave() {
    if (trigger === 'hover') {
      open = false;
    }
  }

  function selectItem(item: DropdownItem) {
    if (item.disabled || item.divider) return;
    dispatch('select', item);
    if (closeOnSelect) {
      open = false;
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (dropdownEl && !dropdownEl.contains(e.target as Node)) {
      open = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      open = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

<div
  bind:this={dropdownEl}
  class="relative inline-block"
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  role="menu"
  tabindex="0"
>
  <!-- Trigger -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div on:click={toggle}>
    <slot name="trigger" {open}>
      <button class="btn">
        Dropdown
        <svg class="w-4 h-4 ml-1" class:rotate-180={open} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </slot>
  </div>

  <!-- Menu -->
  {#if open}
    <div
      class="absolute z-50 min-w-[160px] py-1.5 bg-vscode-editor-background/90 backdrop-blur-xl border border-vscode-border/30 rounded-lg shadow-2xl ring-1 ring-white/5 {positionClasses[position]} transition-all duration-200 origin-top"
    >
      {#each items as item (item.id)}
        {#if item.divider}
          <div class="my-1.5 border-t border-vscode-border/30"></div>
        {:else}
          <button
            class="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-vscode-list-hover/50 transition-colors"
            class:opacity-50={item.disabled}
            class:cursor-not-allowed={item.disabled}
            disabled={item.disabled}
            on:click={() => selectItem(item)}
          >
            {#if item.icon}
              <span class="w-4 h-4 text-vscode-foreground/70">{@html item.icon}</span>
            {/if}
            <span class="text-vscode-foreground">{item.label}</span>
          </button>
        {/if}
      {/each}
      <slot name="footer" />
    </div>
  {/if}
</div>

<style>
  .rotate-180 {
    transform: rotate(180deg);
    transition: transform 0.2s ease;
  }
</style>
