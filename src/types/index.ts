export const CLAUDE_CHAT_VIEW_TYPE = 'claude-chat-view';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

export interface ClaudePluginSettings {
    vaultPath?: string;
    claudeCommand?: string;
}

/**
 * Represents a single conversation session
 */
export interface Session {
    id: string;
    name: string;
    sessionId: string | null; // Claude Code CLI session ID
    createdAt: Date;
    updatedAt: Date;
    messages: ChatMessage[];
}

/**
 * Plugin data persisted to disk
 * Stored in .obsidian/plugins/claude-chat-obsidian/data.json
 */
export interface ClaudePluginData {
    sessionId: string | null; // Deprecated: kept for backward compatibility
    version: string;
    sessions: Session[];
    currentSessionId: string | null;
}
