import { Session } from '../types';

/**
 * Session list sidebar component
 */
export class SessionList {
    private containerEl: HTMLElement;
    private sessions: Session[] = [];
    private currentSessionId: string | null = null;
    private onSessionSelect?: (sessionId: string) => void;
    private onSessionDelete?: (sessionId: string) => void;
    private onSessionRename?: (sessionId: string, newName: string) => void;
    private onNewSession?: () => void;
    private onTogglePanel?: () => void;

    constructor(
        containerEl: HTMLElement,
        callbacks: {
            onSessionSelect?: (sessionId: string) => void;
            onSessionDelete?: (sessionId: string) => void;
            onSessionRename?: (sessionId: string, newName: string) => void;
            onNewSession?: () => void;
            onTogglePanel?: () => void;
        }
    ) {
        this.containerEl = containerEl;
        this.onSessionSelect = callbacks.onSessionSelect;
        this.onSessionDelete = callbacks.onSessionDelete;
        this.onSessionRename = callbacks.onSessionRename;
        this.onNewSession = callbacks.onNewSession;
        this.onTogglePanel = callbacks.onTogglePanel;
        console.log('SessionList: Constructor called, container:', containerEl);
        this.render();
    }

    /**
     * Update the sessions list
     */
    updateSessions(sessions: Session[], currentSessionId: string | null) {
        this.sessions = sessions;
        this.currentSessionId = currentSessionId;
        console.log('SessionList: updateSessions called with', sessions.length, 'sessions');
        this.render();
    }

    private render() {
        this.containerEl.empty();
        this.containerEl.addClass('claude-session-list');

        console.log('SessionList: render() called, sessions:', this.sessions.length);

        // Header with title, collapse button, and new session button
        const headerEl = this.containerEl.createEl('div', {
            cls: 'claude-session-list-header',
        });

        // Title and collapse button container (left side)
        const headerLeftEl = headerEl.createEl('div', {
            cls: 'claude-session-list-header-left',
        });

        // Collapse button (chevron icon)
        const collapseBtn = headerLeftEl.createEl('button', {
            cls: 'claude-session-collapse-button',
        });
        collapseBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        `;
        collapseBtn.setAttribute('aria-label', 'Collapse panel');
        collapseBtn.addEventListener('click', () => {
            if (this.onTogglePanel) {
                this.onTogglePanel();
            }
        });

        const titleEl = headerLeftEl.createEl('h3', {
            cls: 'claude-session-list-title',
        });
        titleEl.textContent = 'Sessions';

        // New session button (right side)
        const newSessionBtn = headerEl.createEl('button', {
            cls: 'claude-new-session-button',
        });
        newSessionBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14M5 12h14"></path>
            </svg>
        `;
        newSessionBtn.setAttribute('aria-label', 'New session');
        newSessionBtn.addEventListener('click', () => {
            if (this.onNewSession) {
                this.onNewSession();
            }
        });

        // Sessions list
        const listEl = this.containerEl.createEl('div', {
            cls: 'claude-session-list-items',
        });

        if (this.sessions.length === 0) {
            const emptyEl = listEl.createEl('div', {
                cls: 'claude-session-empty',
            });
            emptyEl.textContent = 'No sessions yet';
            return;
        }

        for (const session of this.sessions) {
            const sessionEl = this.createSessionItem(session);
            listEl.appendChild(sessionEl);
        }

        console.log('SessionList: render() complete, added', this.sessions.length, 'session items');
    }

    private createSessionItem(session: Session): HTMLElement {
        const isActive = session.id === this.currentSessionId;

        const itemEl = document.createElement('div');
        itemEl.className = 'claude-session-item';
        if (isActive) {
            itemEl.classList.add('claude-session-item-active');
        }

        // Session content (clickable for selection)
        const contentEl = itemEl.createEl('div', {
            cls: 'claude-session-item-content',
        });

        const nameEl = contentEl.createEl('div', {
            cls: 'claude-session-item-name',
        });
        nameEl.textContent = session.name;

        const metaEl = contentEl.createEl('div', {
            cls: 'claude-session-item-meta',
        });

        const messageCount = session.messages.filter(m => m.role !== 'system').length;
        metaEl.textContent = `${messageCount} message${messageCount !== 1 ? 's' : ''}`;

        const timeEl = contentEl.createEl('div', {
            cls: 'claude-session-item-time',
        });
        timeEl.textContent = this.formatTime(session.updatedAt);

        // Session actions (delete, rename)
        const actionsEl = itemEl.createEl('div', {
            cls: 'claude-session-item-actions',
        });

        // Rename button
        const renameBtn = actionsEl.createEl('button', {
            cls: 'claude-session-action-button',
        });
        renameBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
        `;
        renameBtn.setAttribute('aria-label', 'Rename session');
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.promptRename(session.id);
        });

        // Delete button
        const deleteBtn = actionsEl.createEl('button', {
            cls: 'claude-session-action-button claude-session-delete-button',
        });
        deleteBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        `;
        deleteBtn.setAttribute('aria-label', 'Delete session');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDelete(session.id);
        });

        // Click on content to select session
        contentEl.addEventListener('click', () => {
            if (this.onSessionSelect) {
                this.onSessionSelect(session.id);
            }
        });

        return itemEl;
    }

    private formatTime(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    }

    private promptRename(sessionId: string) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        const newName = prompt('Enter new session name:', session.name);
        if (newName && newName.trim() && newName !== session.name) {
            if (this.onSessionRename) {
                this.onSessionRename(sessionId, newName.trim());
            }
        }
    }

    private confirmDelete(sessionId: string) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        if (confirm(`Delete session "${session.name}"? This action cannot be undone.`)) {
            if (this.onSessionDelete) {
                this.onSessionDelete(sessionId);
            }
        }
    }

    destroy() {
        this.containerEl.empty();
        this.containerEl.removeClass('claude-session-list');
    }
}
