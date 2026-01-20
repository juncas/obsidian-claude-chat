import { Session } from '../types';

/**
 * Session tabs component (like Obsidian tabs)
 */
export class SessionTabs {
    private containerEl: HTMLElement;
    private sessions: Session[] = [];
    private currentSessionId: string | null = null;
    private onSessionSelect?: (sessionId: string) => void;
    private onNewSession?: () => void;
    private onSessionDelete?: (sessionId: string) => void;
    private onSessionRename?: (sessionId: string, newName: string) => void;

    constructor(
        containerEl: HTMLElement,
        callbacks: {
            onSessionSelect?: (sessionId: string) => void;
            onNewSession?: () => void;
            onSessionDelete?: (sessionId: string) => void;
            onSessionRename?: (sessionId: string, newName: string) => void;
        }
    ) {
        this.containerEl = containerEl;
        this.onSessionSelect = callbacks.onSessionSelect;
        this.onNewSession = callbacks.onNewSession;
        this.onSessionDelete = callbacks.onSessionDelete;
        this.onSessionRename = callbacks.onSessionRename;
        console.log('SessionTabs: Constructor called, container:', containerEl);
        this.render();
    }

    updateSessions(sessions: Session[], currentSessionId: string | null) {
        this.sessions = sessions;
        this.currentSessionId = currentSessionId;
        console.log('SessionTabs: updateSessions called with', sessions.length, 'sessions');
        this.render();
    }

    private render() {
        this.containerEl.empty();
        this.containerEl.addClass('claude-session-tabs');

        console.log('SessionTabs: render() called, sessions:', this.sessions.length);

        // Tabs container
        const tabsContainer = this.containerEl.createEl('div', {
            cls: 'claude-session-tabs-container',
        });

        // Scrollable tabs area
        const tabsScroll = tabsContainer.createEl('div', {
            cls: 'claude-session-tabs-scroll',
        });

        const tabsList = tabsScroll.createEl('div', {
            cls: 'claude-session-tabs-list',
        });

        if (this.sessions.length === 0) {
            const emptyEl = tabsList.createEl('div', {
                cls: 'claude-session-tabs-empty',
            });
            emptyEl.textContent = 'No sessions';
        } else {
            for (const session of this.sessions) {
                const tabEl = this.createTab(session);
                tabsList.appendChild(tabEl);
            }
        }

        // New session button (+)
        const newTabBtn = tabsContainer.createEl('button', {
            cls: 'claude-session-tab-new',
        });
        newTabBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14M5 12h14"></path>
            </svg>
        `;
        newTabBtn.setAttribute('aria-label', 'New session');
        newTabBtn.addEventListener('click', () => {
            if (this.onNewSession) {
                this.onNewSession();
            }
        });

        console.log('SessionTabs: render() complete');
    }

    private createTab(session: Session): HTMLElement {
        const isActive = session.id === this.currentSessionId;

        const tabEl = document.createElement('div');
        tabEl.className = 'claude-session-tab';
        if (isActive) {
            tabEl.classList.add('claude-session-tab-active');
        }

        // Tab content (clickable for selection)
        const tabContent = tabEl.createEl('div', {
            cls: 'claude-session-tab-content',
        });

        const tabName = tabContent.createEl('span', {
            cls: 'claude-session-tab-name',
        });
        tabName.textContent = session.name;

        // Close button (only show on hover, and only if there are multiple sessions)
        if (this.sessions.length > 1) {
            const closeBtn = tabContent.createEl('button', {
                cls: 'claude-session-tab-close',
            });
            closeBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
            `;
            closeBtn.setAttribute('aria-label', 'Close session');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmClose(session.id);
            });
        }

        // Click on tab to select session
        tabContent.addEventListener('click', () => {
            if (this.onSessionSelect && !isActive) {
                this.onSessionSelect(session.id);
            }
        });

        // Double-click to rename
        tabContent.addEventListener('dblclick', () => {
            this.promptRename(session.id);
        });

        return tabEl;
    }

    private promptRename(sessionId: string) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        const newName = prompt('Enter session name:', session.name);
        if (newName && newName.trim() && newName !== session.name) {
            if (this.onSessionRename) {
                this.onSessionRename(sessionId, newName.trim());
            }
        }
    }

    private confirmClose(sessionId: string) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        if (this.sessions.length === 1) {
            // Don't allow closing the last session
            return;
        }

        if (confirm(`Close session "${session.name}"?`)) {
            if (this.onSessionDelete) {
                this.onSessionDelete(sessionId);
            }
        }
    }
}
