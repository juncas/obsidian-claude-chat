import { Session, ChatMessage } from '../types';

/**
 * Manages multiple conversation sessions
 */
export class SessionManager {
    private sessions: Session[] = [];
    private currentSessionId: string | null = null;
    private onChangeCallbacks: Array<() => void> = [];

    constructor() {
        this.loadSessions();
    }

    /**
     * Load sessions from plugin data
     */
    loadSessions(sessions: Session[] = [], currentSessionId: string | null = null) {
        this.sessions = sessions.map(s => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
            messages: s.messages.map(m => ({
                ...m,
                timestamp: new Date(m.timestamp),
            })),
        }));
        this.currentSessionId = currentSessionId;

        // Create a default session if none exist
        if (this.sessions.length === 0) {
            this.createSession('Default Session');
        } else if (!this.currentSessionId) {
            // If there's no current session selected, select the first one
            this.currentSessionId = this.sessions[0].id;
        }
    }

    /**
     * Get all sessions
     */
    getSessions(): Session[] {
        return [...this.sessions];
    }

    /**
     * Get current session
     */
    getCurrentSession(): Session | null {
        if (!this.currentSessionId) return null;
        return this.sessions.find(s => s.id === this.currentSessionId) || null;
    }

    /**
     * Get session by ID
     */
    getSession(id: string): Session | null {
        return this.sessions.find(s => s.id === id) || null;
    }

    /**
     * Create a new session
     */
    createSession(name: string): Session {
        const newSession: Session = {
            id: this.generateId(),
            name,
            sessionId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: [],
        };

        this.sessions.push(newSession);
        this.currentSessionId = newSession.id;
        this.notifyChange();
        return newSession;
    }

    /**
     * Update session name
     */
    updateSessionName(sessionId: string, name: string): boolean {
        const session = this.getSession(sessionId);
        if (session) {
            session.name = name;
            session.updatedAt = new Date();
            this.notifyChange();
            return true;
        }
        return false;
    }

    /**
     * Delete a session
     */
    deleteSession(sessionId: string): boolean {
        const index = this.sessions.findIndex(s => s.id === sessionId);
        if (index !== -1) {
            this.sessions.splice(index, 1);

            // If we deleted the current session, switch to another
            if (this.currentSessionId === sessionId) {
                this.currentSessionId = this.sessions.length > 0 ? this.sessions[0].id : null;
                if (this.sessions.length === 0) {
                    this.createSession('Default Session');
                }
            }

            this.notifyChange();
            return true;
        }
        return false;
    }

    /**
     * Switch to a different session
     */
    switchSession(sessionId: string): boolean {
        const session = this.getSession(sessionId);
        if (session) {
            this.currentSessionId = sessionId;
            this.notifyChange();
            return true;
        }
        return false;
    }

    /**
     * Add a message to the current session
     */
    addMessage(message: ChatMessage): void {
        const session = this.getCurrentSession();
        if (session) {
            session.messages.push(message);
            session.updatedAt = new Date();
            this.notifyChange();
        }
    }

    /**
     * Update the Claude Code CLI session ID for the current session
     */
    updateCliSessionId(sessionId: string | null): void {
        const session = this.getCurrentSession();
        if (session) {
            session.sessionId = sessionId;
            session.updatedAt = new Date();
            this.notifyChange();
        }
    }

    /**
     * Clear messages from the current session
     */
    clearCurrentSession(): void {
        const session = this.getCurrentSession();
        if (session) {
            session.messages = [];
            session.updatedAt = new Date();
            this.notifyChange();
        }
    }

    /**
     * Get messages from the current session
     */
    getCurrentMessages(): ChatMessage[] {
        const session = this.getCurrentSession();
        return session ? session.messages : [];
    }

    /**
     * Get the Claude Code CLI session ID for the current session
     */
    getCurrentCliSessionId(): string | null {
        const session = this.getCurrentSession();
        return session ? session.sessionId : null;
    }

    /**
     * Register a callback to be called when sessions change
     */
    onChange(callback: () => void): void {
        this.onChangeCallbacks.push(callback);
    }

    /**
     * Export sessions for persistence
     */
    exportForSave(): { sessions: Session[]; currentSessionId: string | null } {
        return {
            sessions: this.sessions,
            currentSessionId: this.currentSessionId,
        };
    }

    /**
     * Notify all registered callbacks of a change
     */
    private notifyChange(): void {
        for (const callback of this.onChangeCallbacks) {
            callback();
        }
    }

    /**
     * Generate a unique ID for a session
     */
    private generateId(): string {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
