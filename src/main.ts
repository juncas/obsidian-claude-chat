import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ClaudeChatView } from './views/ClaudeChatView';
import { CLAUDE_CHAT_VIEW_TYPE, ClaudePluginData, Session } from './types';
import { SessionManager } from './services/SessionManager';

export default class ClaudeChatPlugin extends Plugin {
    data: ClaudePluginData = {
        sessionId: null, // Deprecated: kept for backward compatibility
        version: '1.0.0',
        sessions: [],
        currentSessionId: null,
    };

    sessionManager: SessionManager = new SessionManager();

    async onload() {
        // Load persisted data
        await this.loadPluginData();

        // Register the view type
        this.registerView(
            CLAUDE_CHAT_VIEW_TYPE,
            (leaf) => new ClaudeChatView(leaf, this)
        );

        // Add ribbon icon to toggle the view
        this.addRibbonIcon('message-square', 'Open Claude Chat', () => {
            this.activateView();
        });

        // Add command to open the chat
        this.addCommand({
            id: 'open-claude-chat',
            name: 'Open Claude Chat',
            callback: () => this.activateView(),
        });

        // Add command to clear chat history
        this.addCommand({
            id: 'claude-chat-clear-history',
            name: 'Clear chat history',
            hotkeys: [{ modifiers: ['Mod'], key: 'k' }],
            callback: () => this.clearChatHistory(),
        });

        // Add command to focus input
        this.addCommand({
            id: 'claude-chat-focus-input',
            name: 'Focus chat input',
            hotkeys: [{ modifiers: ['Mod'], key: 'l' }],
            callback: () => this.focusInput(),
        });

        // Add command to stop generation
        this.addCommand({
            id: 'claude-chat-stop',
            name: 'Stop generation',
            hotkeys: [{ modifiers: [], key: 'Escape' }],
            callback: () => this.stopGeneration(),
        });

        // Add command to start new session
        this.addCommand({
            id: 'claude-chat-new-session',
            name: 'Start new session',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'n' }],
            callback: () => this.startNewSession(),
        });

        // Add command to export conversation
        this.addCommand({
            id: 'claude-chat-export',
            name: 'Export conversation to Markdown',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'e' }],
            callback: () => this.exportConversation(),
        });
    }

    async activateView() {
        const { workspace } = this.app;

        // Check if view already exists
        const existingLeaf = workspace.getLeavesOfType(CLAUDE_CHAT_VIEW_TYPE)[0];

        if (existingLeaf) {
            workspace.revealLeaf(existingLeaf);
        } else {
            // Create new leaf in right sidebar
            const leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                type: CLAUDE_CHAT_VIEW_TYPE,
                active: true,
            });
            }
        }
    }

    onunload() {
        // Cleanup is handled automatically by Obsidian
    }

    /**
     * Load plugin data from disk
     */
    async loadPluginData() {
        const savedData = await this.loadData();
        if (savedData) {
            this.data = savedData as ClaudePluginData;

            // Handle migration from old data format
            if (!this.data.sessions || this.data.sessions.length === 0) {
                // Migrate old sessionId to new session format
                const migratedSession: Session = {
                    id: 'session-migrated',
                    name: 'Migrated Session',
                    sessionId: this.data.sessionId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    messages: [],
                };
                this.data.sessions = [migratedSession];
                this.data.currentSessionId = migratedSession.id;
            }

            // Load sessions into SessionManager
            this.sessionManager.loadSessions(this.data.sessions, this.data.currentSessionId);

            // Set up auto-save when sessions change
            this.sessionManager.onChange(() => {
                this.saveSessions();
            });

            console.log('ClaudeChat: Loaded data, sessions:', this.data.sessions.length);
        } else {
            console.log('ClaudeChat: No saved data found, starting fresh');

            // Set up auto-save when sessions change
            this.sessionManager.onChange(() => {
                this.saveSessions();
            });
        }
    }

    /**
     * Save sessions to plugin data and persist to disk
     */
    async saveSessions() {
        const exported = this.sessionManager.exportForSave();
        this.data.sessions = exported.sessions;
        this.data.currentSessionId = exported.currentSessionId;
        await this.saveData(this.data);
    }

    /**
     * Update the Claude Code CLI session ID (called from view)
     */
    async updateSessionId(sessionId: string | null) {
        this.sessionManager.updateCliSessionId(sessionId);
    }

    /**
     * Get the current Claude Code CLI session ID
     */
    getSessionId(): string | null {
        return this.sessionManager.getCurrentCliSessionId();
    }

    /**
     * Clear chat history
     */
    clearChatHistory() {
        const { workspace } = this.app;
        const existingLeaf = workspace.getLeavesOfType(CLAUDE_CHAT_VIEW_TYPE)[0];

        if (existingLeaf) {
            const view = existingLeaf.view as any;
            if (view.clearHistory) {
                view.clearHistory();
            }
        }
    }

    /**
     * Focus input field
     */
    focusInput() {
        const { workspace } = this.app;
        const existingLeaf = workspace.getLeavesOfType(CLAUDE_CHAT_VIEW_TYPE)[0];

        if (existingLeaf) {
            const view = existingLeaf.view as any;
            if (view.focusInput) {
                view.focusInput();
            }
        }
    }

    /**
     * Stop current generation
     */
    stopGeneration() {
        const { workspace } = this.app;
        const existingLeaf = workspace.getLeavesOfType(CLAUDE_CHAT_VIEW_TYPE)[0];

        if (existingLeaf) {
            const view = existingLeaf.view as any;
            if (view.handleStop) {
                view.handleStop();
            }
        }
    }

    /**
     * Start a new session (creates a new conversation session)
     */
    startNewSession() {
        const session = this.sessionManager.createSession(`Session ${this.sessionManager.getSessions().length + 1}`);
        const { workspace } = this.app;
        const existingLeaf = workspace.getLeavesOfType(CLAUDE_CHAT_VIEW_TYPE)[0];

        if (existingLeaf) {
            const view = existingLeaf.view as any;
            if (view.loadSession) {
                view.loadSession(session.id);
            }
        }
    }

    /**
     * Export conversation to Markdown
     */
    async exportConversation() {
        const { workspace } = this.app;
        const existingLeaf = workspace.getLeavesOfType(CLAUDE_CHAT_VIEW_TYPE)[0];

        if (existingLeaf) {
            const view = existingLeaf.view as any;
            if (view.exportConversation) {
                await view.exportConversation();
            }
        }
    }
}
