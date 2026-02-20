/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,svelte}'],
  theme: {
    extend: {
      colors: {
        // VS Code theme colors mapped to Tailwind
        'vscode-foreground': 'var(--vscode-foreground)',
        'vscode-background': 'var(--vscode-editor-background)',
        'vscode-sidebar-bg': 'var(--vscode-sideBar-background)',
        'vscode-panel-bg': 'var(--vscode-panel-background)',

        // Button colors
        'vscode-button-bg': 'var(--vscode-button-background)',
        'vscode-button-fg': 'var(--vscode-button-foreground)',
        'vscode-button-hover': 'var(--vscode-button-hoverBackground)',
        'vscode-button-secondary-bg': 'var(--vscode-button-secondaryBackground)',
        'vscode-button-secondary-fg': 'var(--vscode-button-secondaryForeground)',

        // Input colors
        'vscode-input-bg': 'var(--vscode-input-background)',
        'vscode-input-fg': 'var(--vscode-input-foreground)',
        'vscode-input-border': 'var(--vscode-input-border)',
        'vscode-input-placeholder': 'var(--vscode-input-placeholderForeground)',

        // Focus and selection
        'vscode-focus-border': 'var(--vscode-focusBorder)',
        'vscode-selection-bg': 'var(--vscode-editor-selectionBackground)',

        // Status colors
        'vscode-error': 'var(--vscode-errorForeground)',
        'vscode-warning': 'var(--vscode-editorWarning-foreground)',
        'vscode-info': 'var(--vscode-editorInfo-foreground)',

        // List colors
        'vscode-list-hover': 'var(--vscode-list-hoverBackground)',
        'vscode-list-active': 'var(--vscode-list-activeSelectionBackground)',
        'vscode-list-active-fg': 'var(--vscode-list-activeSelectionForeground)',

        // Border colors
        'vscode-border': 'var(--vscode-panel-border)',
        'vscode-divider': 'var(--vscode-settings-headerForeground)',

        // Badge colors
        'vscode-badge-bg': 'var(--vscode-badge-background)',
        'vscode-badge-fg': 'var(--vscode-badge-foreground)',

        // Link colors
        'vscode-link': 'var(--vscode-textLink-foreground)',
        'vscode-link-hover': 'var(--vscode-textLink-activeForeground)',

        // Dropdown colors
        'vscode-dropdown-bg': 'var(--vscode-dropdown-background)',
        'vscode-dropdown-fg': 'var(--vscode-dropdown-foreground)',
        'vscode-dropdown-border': 'var(--vscode-dropdown-border)',

        // HTTP Method colors
        'method-get': '#61affe',
        'method-post': '#49cc90',
        'method-put': '#fca130',
        'method-patch': '#50e3c2',
        'method-delete': '#f93e3e',
        'method-head': '#9012fe',
        'method-options': '#0d5aa7',
      },
      fontFamily: {
        'vscode': 'var(--vscode-font-family)',
        'vscode-editor': 'var(--vscode-editor-font-family)',
      },
      fontSize: {
        'vscode': 'var(--vscode-font-size)',
        'vscode-editor': 'var(--vscode-editor-font-size)',
      },
      borderRadius: {
        'vscode': '2px',
      },
      animation: {
        'spin-fast': 'spin 0.5s linear infinite',
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
