# APIForge

<p align="center">
  <img src="media/icon.png" alt="APIForge Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Enterprise-level API testing tool for VS Code</strong>
</p>

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/sitharaj.apiforge?label=VS%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=sitharaj.apiforge)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/sitharaj88/apiforge/blob/main/LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/sitharaj88/apiforge)](https://github.com/sitharaj88/apiforge/issues)

A modern, feature-rich API client built directly into Visual Studio Code. Test REST, GraphQL, WebSocket, and gRPC APIs without leaving your editor.

---

## Features

### Comprehensive Protocol Support

- **REST APIs** — Full support for all HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS).
- **GraphQL** — Built-in query editor with syntax highlighting, variables support, and schema introspection.
- **WebSocket** — Real-time, persistent WebSocket connections with message history and event logging.
- **gRPC** — Protocol buffer support *(coming soon)*.

### Modern, Native UI

- **Seamless Integration** — Built with Svelte and Tailwind CSS to perfectly match your active VS Code theme (dark, light, high contrast).
- **Split Panes** — View your request and response side-by-side.
- **Syntax Highlighting** — Beautifully formatted JSON, XML, HTML, and GraphQL responses with collapsible tree view.

### Advanced Authentication

- Basic Auth (username & password)
- Bearer Token / JWT
- API Keys (header or query parameter)
- OAuth 2.0 with PKCE

### Organization & Workflows

- **Collections** — Group related requests into folders and collections. Rename, duplicate, and organize with ease.
- **Environments** — Define variables for `development`, `staging`, and `production`. Switch between them with a single click.
- **History** — Automatically track all your past requests and their full response data.

### Developer Tools

- **Code Generation** — Instantly generate code snippets in cURL, Fetch, Axios, Python (Requests), Go, and more.
- **Assertions & Testing** — Write tests to validate response status codes, headers, and JSON body properties.
- **Import/Export** — Migrate data seamlessly with support for OpenAPI, Postman, and Thunder Client formats.
- **Pre-request & Post-response Scripts** — Run custom JavaScript before and after requests.

---

## Installation

1. Open Visual Studio Code.
2. Go to the Extensions view (`Ctrl+Shift+X` on Windows/Linux, `Cmd+Shift+X` on macOS).
3. Search for **"APIForge"**.
4. Click **Install**.
5. Once installed, click the **APIForge icon** in the Activity Bar to get started!

---

## Quick Start

1. Click the **APIForge** icon in the Activity Bar.
2. Click the **+** button to create a new request.
3. Select your HTTP method (e.g., `GET`) and enter a URL (e.g., `https://jsonplaceholder.typicode.com/users`).
4. Configure any necessary Headers, Query Parameters, or Body data.
5. Click **Send** and view the response instantly!

---

## Keyboard Shortcuts

| Action         | Windows/Linux   | macOS         |
| -------------- | --------------- | ------------- |
| Open APIForge  | `Ctrl+Shift+A`  | `Cmd+Shift+A` |
| New Request    | `Ctrl+N`        | `Cmd+N`       |
| Send Request   | `Ctrl+Enter`    | `Cmd+Enter`   |

---

## Configuration

APIForge can be customized via your VS Code `settings.json`:

```json
{
  "apiforge.defaultTimeout": 30000,
  "apiforge.maxHistoryItems": 100,
  "apiforge.followRedirects": true,
  "apiforge.validateSSL": true,
  "apiforge.proxy.enabled": false,
  "apiforge.proxy.url": ""
}
```

---

## Data Storage & Version Control

APIForge stores your collections and environments locally in a `.apiforge` folder at the root of your workspace:

```
.apiforge/
├── collections/
│   └── my-collection.json
├── environments/
│   ├── development.json
│   └── production.json
└── apiforge.config.json
```

**Benefits:**
- **Version Control** — Commit your API collections to Git alongside your code.
- **Team Collaboration** — Share configurations effortlessly with your team.
- **Security** — Sensitive data (like tokens) is kept local and secure using VS Code's SecretStorage API.

---

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/sitharaj88/apiforge.git
cd apiforge

# Install dependencies
npm install
cd webview-ui && npm install && cd ..

# Build the extension and webview
npm run build

# Watch for changes during development
npm run dev
```

### Debugging

1. Open the project in VS Code.
2. Press `F5` to launch the Extension Development Host.
3. The extension will load in a new VS Code window.

---

## Contributing

Contributions are always welcome! Whether it's a bug report, feature request, or a pull request, please feel free to contribute on [GitHub](https://github.com/sitharaj88/apiforge).

---

## Author

**Sitharaj Seenivasan** — [@sitharaj88](https://github.com/sitharaj88)

---

## License

Licensed under the [Apache License 2.0](LICENSE).

---

## Acknowledgments

- Built with [Svelte](https://svelte.dev/) and [Tailwind CSS](https://tailwindcss.com/).

---

## Support

If you find APIForge helpful, consider buying me a coffee! Your support helps keep the project actively maintained and free for everyone.

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow?logo=buy-me-a-coffee)](https://buymeacoffee.com/sitharaj88)
