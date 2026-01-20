import { ItemView, WorkspaceLeaf } from 'obsidian';
import ClaudeChatPlugin from '../main';
import { ClaudeProcessManager } from '../services/ClaudeProcess';
import { SessionManager } from '../services/SessionManager';
import { ChatInput } from '../ui/ChatInput';
import { MessageContainer } from '../ui/MessageContainer';
import { SessionTabs } from '../ui/SessionTabs';
import { CLAUDE_CHAT_VIEW_TYPE, ChatMessage } from '../types';

export class ClaudeChatView extends ItemView {
    plugin: ClaudeChatPlugin;
    processManager: ClaudeProcessManager;
    sessionManager: SessionManager;
    messageContainer: MessageContainer;
    chatInput: ChatInput;
    sessionTabs: SessionTabs;
    isProcessing: boolean = false;

    constructor(leaf: WorkspaceLeaf, plugin: ClaudeChatPlugin) {
        super(leaf);
        this.plugin = plugin;
        // Get vault path from the adapter
        const vaultPath = (this.app.vault.adapter as any).basePath || '';
        // Use singleton instance to maintain session
        this.processManager = ClaudeProcessManager.getInstance(vaultPath);
        // Get session manager from plugin
        this.sessionManager = plugin.sessionManager;
    }

    getViewType(): string {
        return CLAUDE_CHAT_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Claude Chat';
    }

    getIcon(): string {
        return 'message-square';
    }

    async onOpen() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('claude-chat-container');

        // Get vault path for debugging
        const vaultPath = (this.app.vault.adapter as any).basePath || '';
        console.log('ClaudeChatView: Vault path:', vaultPath);

        // Create main layout
        const mainLayout = container.createEl('div', {
            cls: 'claude-chat-main-layout',
        });

        // Create content area
        const contentEl = mainLayout.createEl('div', {
            cls: 'claude-chat-content',
        });

        // Session tabs (at the top)
        const tabsContainer = contentEl.createEl('div', {
            cls: 'claude-session-tabs-wrapper',
        });

        this.sessionTabs = new SessionTabs(tabsContainer, {
            onSessionSelect: (sessionId) => this.loadSession(sessionId),
            onNewSession: () => this.createNewSession(),
            onSessionDelete: (sessionId) => this.deleteSession(sessionId),
            onSessionRename: (sessionId, newName) => this.renameSession(sessionId, newName),
        });

        // Initialize session tabs with current sessions
        this.updateSessionList();

        // Load session ID from current session and set it in process manager
        const savedSessionId = this.sessionManager.getCurrentCliSessionId();
        if (savedSessionId) {
            console.log('ClaudeChatView: Restoring session ID:', savedSessionId);
            this.processManager.setSessionId(savedSessionId);
        }

        // Set up session ID change callback to persist changes to SessionManager
        this.processManager.setSessionIdChangeCallback(async (sessionId: string | null) => {
            console.log('ClaudeChatView: Session ID changed, saving:', sessionId || '(null)');
            await this.plugin.updateSessionId(sessionId);
        });

        // Create message display area
        this.messageContainer = new MessageContainer(contentEl, this.app);

        // Set up edit message callback
        this.messageContainer.setOnEditMessage(async (index: number, content: string) => {
            await this.handleEditMessage(index, content);
        });

        // Load messages from current session
        this.loadCurrentSessionMessages();

        // Create input actions container
        const inputActionsEl = contentEl.createEl('div', {
            cls: 'claude-chat-input-actions',
        });

        // Add action buttons (export, clear, regenerate)
        this.createActionButton(inputActionsEl, 'Export', 'Export conversation to Markdown (Ctrl+Shift+E)', () => this.exportConversation());
        this.createActionButton(inputActionsEl, 'Clear', 'Clear chat history (Ctrl+K)', () => this.clearHistory());
        this.createActionButton(inputActionsEl, 'Regenerate', 'Regenerate last response', () => this.regenerateLast());

        // Create input area with stop handler
        this.chatInput = new ChatInput(
            contentEl,
            async (command: string) => {
                await this.handleCommand(command);
            },
            () => {
                this.handleStop();
            }
        );
    }

    private createActionButton(container: HTMLElement, label: string, tooltip: string, onClick: () => void) {
        const button = container.createEl('button', {
            cls: 'claude-chat-action-button',
        });
        button.textContent = label;
        button.setAttribute('aria-label', tooltip);
        button.setAttribute('title', tooltip);
        button.addEventListener('click', onClick);
    }

    private loadCurrentSessionMessages() {
        const messages = this.sessionManager.getCurrentMessages();

        if (messages.length === 0) {
            // Add welcome message with keyboard shortcuts
            const welcomeContent = `Claude Chat - Enter commands to interact with Claude Code CLI

**Keyboard Shortcuts:**
• \`Ctrl+Shift+N\` - New session
• \`Ctrl+Shift+E\` - Export conversation
• \`Ctrl+K\` - Clear history
• \`Ctrl+L\` - Focus input
• \`↑/↓\` - Browse command history
• \`Shift+Enter\` - New line
• \`Escape\` - Stop generation

**Tips:**
• Click on user messages to edit and resend
• Hover over messages to copy content
• Use the toolbar buttons for quick actions`;

            this.messageContainer.addMessage({
                role: 'system',
                content: welcomeContent,
                timestamp: new Date(),
            });
        } else {
            // Load existing messages
            for (const message of messages) {
                this.messageContainer.addMessage(message);
            }
        }
    }

    private updateSessionList() {
        this.sessionTabs.updateSessions(
            this.sessionManager.getSessions(),
            this.sessionManager.getCurrentSession()?.id || null
        );
    }

    async handleCommand(command: string) {
        console.log('ClaudeChatView: handleCommand called with:', command);
        if (this.isProcessing) {
            console.log('ClaudeChatView: Already processing, ignoring');
            return;
        }

        this.isProcessing = true;
        this.chatInput.setProcessing(true);

        // Add user message to UI
        this.messageContainer.addUserMessage(command);

        // Save user message to session
        this.sessionManager.addMessage({
            role: 'user',
            content: command,
            timestamp: new Date(),
        });

        // Create assistant message with thinking indicator
        this.messageContainer.createAssistantMessage();

        try {
            console.log('ClaudeChatView: Executing command...');
            // Execute command and stream output
            await this.processManager.executeCommand(
                command,
                // onData callback - thinking indicator automatically removed on first append
                (chunk: string) => {
                    console.log('ClaudeChatView: Received chunk:', chunk.substring(0, 50));
                    this.messageContainer.appendToAssistantMessage(chunk);
                },
                // onComplete callback
                () => {
                    console.log('ClaudeChatView: Command completed');
                    this.messageContainer.finalizeAssistantMessage();

                    // Save assistant message to session
                    const messages = this.messageContainer.getMessages();
                    const lastMessage = messages[messages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                        this.sessionManager.addMessage(lastMessage);
                    }

                    // Update session list to reflect new message count
                    this.updateSessionList();
                }
            );
            console.log('ClaudeChatView: Command execution finished successfully');
        } catch (error: any) {
            console.error('ClaudeChatView: Command error:', error);
            this.messageContainer.hideThinking();
            this.messageContainer.appendToAssistantMessage(`\n\n**Error:** ${error.message}`);
            this.messageContainer.finalizeAssistantMessage();

            // Save error message to session
            const messages = this.messageContainer.getMessages();
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
                this.sessionManager.addMessage(lastMessage);
            }
        } finally {
            this.isProcessing = false;
            this.chatInput.setProcessing(false);
            this.chatInput.focus();
        }
    }

    handleStop() {
        console.log('ClaudeChatView: Stop requested');
        if (this.isProcessing) {
            // Stop the process
            this.processManager.stopCommand();

            // Add stopped message
            this.messageContainer.hideThinking();
            this.messageContainer.appendToAssistantMessage('\n\n_Stopped by user_');
            this.messageContainer.finalizeAssistantMessage();

            // Reset state
            this.isProcessing = false;
            this.chatInput.setProcessing(false);
        }
    }

    clearHistory() {
        // Clear messages from session
        this.sessionManager.clearCurrentSession();

        // Clear all messages from UI
        this.messageContainer.clear();

        // Re-add welcome message
        this.messageContainer.addMessage({
            role: 'system',
            content: 'Claude Chat - History cleared',
            timestamp: new Date(),
        });

        // Update session list
        this.updateSessionList();
    }

    focusInput() {
        this.chatInput.focus();
    }

    loadSession(sessionId: string) {
        // Switch to the selected session
        const switched = this.sessionManager.switchSession(sessionId);
        if (!switched) {
            console.error('ClaudeChatView: Failed to switch to session:', sessionId);
            return;
        }

        // Update the process manager's session ID
        const session = this.sessionManager.getCurrentSession();
        if (session) {
            this.processManager.setSessionId(session.sessionId);
        }

        // Clear and reload messages
        this.messageContainer.clear();
        this.loadCurrentSessionMessages();

        // Update session list to show active session
        this.updateSessionList();

        // Focus input
        this.chatInput.focus();
    }

    createNewSession() {
        const session = this.sessionManager.createSession(`Session ${this.sessionManager.getSessions().length}`);
        this.loadSession(session.id);
    }

    deleteSession(sessionId: string) {
        const deleted = this.sessionManager.deleteSession(sessionId);
        if (!deleted) {
            console.error('ClaudeChatView: Failed to delete session:', sessionId);
            return;
        }

        // If the current session was deleted, reload to switch to the new current session
        const currentSession = this.sessionManager.getCurrentSession();
        if (currentSession) {
            this.loadSession(currentSession.id);
        } else {
            // No sessions left, create a new one
            this.createNewSession();
        }
    }

    renameSession(sessionId: string, newName: string) {
        const renamed = this.sessionManager.updateSessionName(sessionId, newName);
        if (renamed) {
            this.updateSessionList();
        }
    }

    async exportConversation() {
        const messages = this.sessionManager.getCurrentMessages();

        if (messages.length === 0) {
            // No messages to export
            return;
        }

        const currentSession = this.sessionManager.getCurrentSession();
        const sessionName = currentSession?.name || 'Conversation';

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const safeName = sessionName.replace(/[^a-zA-Z0-9]/g, '-');
        const filename = `claude-chat-${safeName}-${timestamp}.md`;

        // Build markdown content
        let content = `# Claude Chat Conversation\n\n`;
        content += `**Session:** ${sessionName}\n\n`;
        content += `*Exported: ${new Date().toLocaleString()}*\n\n`;
        content += `*Claude Session ID: ${currentSession?.sessionId || 'N/A'}*\n\n`;
        content += `---\n\n`;

        for (const message of messages) {
            if (message.role === 'system') continue; // Skip system messages

            const roleLabel = message.role === 'user' ? '👤 User' : '🤖 Assistant';
            const timeLabel = message.timestamp.toLocaleTimeString();

            content += `## ${roleLabel}\n\n`;
            content += `*${timeLabel}*\n\n`;
            content += `${message.content}\n\n`;
            content += `---\n\n`;
        }

        // Save to vault
        const vault = this.app.vault;
        await vault.create(filename, content);

        // Open the exported file
        const file = vault.getAbstractFileByPath(filename);
        if (file) {
            await this.app.workspace.openLinkText(filename, '', true);
        }
    }

    async handleEditMessage(index: number, content: string) {
        console.log('ClaudeChatView: Edit message at index', index, 'with new content:', content);

        // Remove all messages after this one (they'll be regenerated)
        this.messageContainer.removeMessagesAfter(index);

        // Re-execute the edited command
        await this.handleCommand(content);
    }

    async regenerateLast() {
        const messages = this.messageContainer.getMessages();

        // Find the last user message
        let lastUserIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserIndex = i;
                break;
            }
        }

        if (lastUserIndex >= 0) {
            // Remove messages after the last user message (including assistant response)
            this.messageContainer.removeMessagesAfter(lastUserIndex - 1);

            // Re-execute the last user command
            await this.handleCommand(messages[lastUserIndex].content);
        }
    }

    async onClose() {
        this.processManager.cleanup();
    }
}
