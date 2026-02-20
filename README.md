# APIForge

<p align="center">
  <img src="media/apiforge-icon.svg" alt="APIForge Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Enterprise-level API testing tool for VS Code</strong>
</p>

<p align="center">
  A modern, feature-rich API client built directly into Visual Studio Code. Test REST, GraphQL, WebSocket, and gRPC APIs without leaving your editor.
</p>

## Features

### Core Features

- **Modern UI** - Beautiful, intuitive interface that matches VS Code's theme
- **HTTP Methods** - Support for GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **Request Builder** - Visual editor for headers, query params, and body
- **Response Viewer** - Syntax-highlighted response body with headers and cookies

### Authentication

- No Auth
- Basic Authentication
- Bearer Token / JWT
- API Key (header or query param)
- OAuth 2.0 with PKCE (coming soon)

### Organization

- **Collections** - Organize requests into folders and collections
- **Environments** - Manage variables across different environments
- **History** - Track all your requests with full response data

### Advanced Features

- **GraphQL Support** - Query editor with schema introspection
- **WebSocket** - Real-time WebSocket connections
- **gRPC** - Protocol buffer support (coming soon)
- **Mock Server** - Built-in mock server for testing
- **Import/Export** - OpenAPI, Postman, and Thunder Client support

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "APIForge"
4. Click Install

## Quick Start

1. Click the APIForge icon in the Activity Bar
2. Enter a URL in the request builder
3. Select your HTTP method
4. Click "Send"

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Open APIForge | `Ctrl+Shift+A` | `Cmd+Shift+A` |
| New Request | `Ctrl+N` | `Cmd+N` |
| Send Request | `Ctrl+Enter` | `Cmd+Enter` |

## Configuration

APIForge can be configured in VS Code settings:

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

## Data Storage

APIForge stores collections and environments in a `.apiforge` folder in your workspace:

```
.apiforge/
├── collections/
│   └── my-collection.json
├── environments/
│   ├── development.json
│   └── production.json
└── apiforge.config.json
```

This allows you to:
- Version control your API collections with Git
- Share configurations with your team
- Keep sensitive data local with SecretStorage

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/apiforge/vscode-apiforge.git
cd vscode-apiforge

# Install dependencies
npm install
cd webview-ui && npm install && cd ..

# Build
npm run build

# Watch for changes
npm run dev
```

### Debug

1. Open the project in VS Code
2. Press F5 to launch the Extension Development Host
3. The extension will be loaded in the new VS Code window

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built with [Svelte](https://svelte.dev/) and [Tailwind CSS](https://tailwindcss.com/)
- Inspired by [Thunder Client](https://www.thunderclient.com/), [Postman](https://www.postman.com/), and [Insomnia](https://insomnia.rest/)
