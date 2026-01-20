# Claude Chat for Obsidian

A native chat interface for [Claude Code CLI](https://github.com/anthropics/claude-code) in Obsidian. This plugin brings the power of Claude's AI assistant directly into your Obsidian workspace with a clean, integrated interface.

![Claude Chat](https://img.shields.io/badge/Obsidian-1.0.0-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Multi-Session Conversations** - Create and manage multiple chat sessions simultaneously
- **Streaming Responses** - Watch Claude's responses stream in real-time
- **Message Editing** - Edit your messages and regenerate responses
- **Markdown Rendering** - Full markdown support with syntax highlighting
- **Export Conversations** - Export your chats to markdown files
- **Session Management** - Rename, delete, and switch between sessions easily
- **Keyboard Shortcuts** - Quick access to common actions
- **Dark/Light Theme** - Automatically adapts to your Obsidian theme

## Prerequisites

Before installing this plugin, you need to have **Claude Code CLI** installed on your system.

### Installing Claude Code CLI

1. Install Node.js (v18 or higher) from [nodejs.org](https://nodejs.org/)

2. Install Claude Code CLI globally:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

3. Authenticate with Claude:
   ```bash
   claude auth login
   ```

4. Verify installation:
   ```bash
   claude --version
   ```

For more details, visit the [official Claude Code documentation](https://github.com/anthropics/claude-code).

## Installation

### Method 1: Obsidian Plugin Manager (Recommended)

1. Open Obsidian Settings
2. Go to **Community Plugins**
3. Turn on **Community Plugins**
4. Click **Browse** and search for "Claude Chat"
5. Click **Install** and then **Enable**

### Method 2: Manual Installation

1. Download the latest release from the [Releases](https://github.com/juncas/obsidian-claude-chat/releases) page
2. Extract the downloaded zip file
3. Move the extracted folder to your vault's `.obsidian/plugins/` directory
4. Restart Obsidian
5. Enable the plugin in Settings > Community Plugins

### Method 3: From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/juncas/obsidian-claude-chat.git
   ```

2. Install dependencies:
   ```bash
   cd obsidian-claude-chat
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Copy the entire folder to your vault's `.obsidian/plugins/` directory
5. Enable the plugin in Obsidian

## Usage

### Opening the Chat Interface

There are several ways to open Claude Chat:

- **Command Palette**: Press `Ctrl/Cmd + P` and type "Open Claude Chat"
- **Ribbon Icon**: Click the Claude icon in the left ribbon
- **Hotkey**: Set a custom hotkey in Settings

### Chatting with Claude

1. Type your message in the input box at the bottom
2. Press `Enter` to send (or `Shift + Enter` for a new line)
3. Watch Claude's response stream in real-time
4. Use the stop button to interrupt generation

### Managing Sessions

- **New Session**: Click the `+` tab or press `Ctrl/Cmd + Shift + N`
- **Switch Sessions**: Click on a session tab
- **Rename Session**: Right-click on a tab and select "Rename"
- **Delete Session**: Right-click on a tab and select "Delete"

### Editing Messages

1. Hover over any message (yours or Claude's)
2. Click the edit icon
3. Modify the message
4. Press `Enter` to regenerate the response

### Exporting Conversations

- Use the command palette and type "Export conversation to markdown"
- The chat will be saved as a markdown file in your vault

## Keyboard Shortcuts

| Command | Windows/Linux | macOS |
|---------|---------------|-------|
| Open Claude Chat | `Ctrl + Shift + C` | `Cmd + Shift + C` |
| New Session | `Ctrl + Shift + N` | `Cmd + Shift + N` |
| Clear History | `Ctrl + Shift + D` | `Cmd + Shift + D` |
| Focus Input | `Ctrl + Shift + /` | `Cmd + Shift + /` |
| Stop Generation | `Escape` | `Escape` |

*You can customize these shortcuts in Obsidian's Hotkey settings*

## Configuration

The plugin stores all conversation data in your vault's `.obsidian/plugins/claude-chat-obsidian/` directory. Data includes:

- Active session
- Chat history
- Session metadata

This data is synced across devices if you use Obsidian Sync or a cloud-synced vault.

## Development

### Project Structure

```
claude-chat-obsidian/
├── src/
│   ├── main.ts              # Plugin entry point
│   ├── types/               # TypeScript type definitions
│   ├── services/            # Business logic (ClaudeProcess, SessionManager)
│   ├── ui/                  # UI components (ChatInput, MessageContainer, etc.)
│   └── views/               # Main chat view
├── styles.css               # Plugin styles
├── manifest.json            # Plugin manifest
├── package.json             # NPM configuration
└── tsconfig.json            # TypeScript configuration
```

### Building for Development

```bash
npm run dev
```

This runs esbuild in watch mode, automatically rebuilding when you make changes.

### Building for Production

```bash
npm run build
```

## Troubleshooting

### "Claude CLI not found" Error

Make sure Claude Code CLI is installed and accessible:
```bash
claude --version
```

If not found, reinstall it:
```bash
npm install -g @anthropic-ai/claude-code
```

### "Authentication Required" Error

Run the authentication command:
```bash
claude auth login
```

### Plugin Not Appearing

1. Check that Community Plugins are enabled in Settings
2. Verify the plugin is installed in the correct directory
3. Check Obsidian's developer console for errors (Ctrl/Cmd + Shift + I)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Acknowledgments

- Built with [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- Powered by [Claude Code CLI](https://github.com/anthropics/claude-code)
- Inspired by the need for a native Claude interface in Obsidian

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/juncas/obsidian-claude-chat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/juncas/obsidian-claude-chat/discussions)

---

Made with [Obsidian](https://obsidian.md) and [Claude](https://claude.ai)
