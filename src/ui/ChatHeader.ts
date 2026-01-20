export class ChatHeader {
    private containerEl: HTMLElement;
    private buttons: Map<string, HTMLElement> = new Map();

    constructor(
        containerEl: HTMLElement,
        private actions: {
            onNewSession?: () => void;
            onExport?: () => void;
            onClearHistory?: () => void;
            onRegenerate?: () => void;
        }
    ) {
        this.containerEl = containerEl;
        this.render();
    }

    private render() {
        const headerEl = this.containerEl.createEl('div', {
            cls: 'claude-chat-header',
        });

        // Title
        const titleEl = headerEl.createEl('div', {
            cls: 'claude-chat-header-title',
        });

        titleEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Claude Chat</span>
        `;

        // Toolbar
        const toolbarEl = headerEl.createEl('div', {
            cls: 'claude-chat-header-toolbar',
        });

        // New session button
        if (this.actions.onNewSession) {
            const newSessionBtn = this.createToolbarButton({
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 5v14M5 12h14"></path>
                </svg>`,
                label: 'New session',
                tooltip: 'Start new session (Ctrl+Shift+N)',
                onClick: () => this.actions.onNewSession?.(),
            });
            toolbarEl.appendChild(newSessionBtn);
            this.buttons.set('newSession', newSessionBtn);
        }

        // Export button
        if (this.actions.onExport) {
            const exportBtn = this.createToolbarButton({
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>`,
                label: 'Export',
                tooltip: 'Export conversation (Ctrl+Shift+E)',
                onClick: () => this.actions.onExport?.(),
            });
            toolbarEl.appendChild(exportBtn);
            this.buttons.set('export', exportBtn);
        }

        // Clear history button
        if (this.actions.onClearHistory) {
            const clearBtn = this.createToolbarButton({
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>`,
                label: 'Clear',
                tooltip: 'Clear history (Ctrl+K)',
                onClick: () => this.actions.onClearHistory?.(),
            });
            toolbarEl.appendChild(clearBtn);
            this.buttons.set('clear', clearBtn);
        }

        // Regenerate button
        if (this.actions.onRegenerate) {
            const regenerateBtn = this.createToolbarButton({
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>`,
                label: 'Regenerate',
                tooltip: 'Regenerate last response',
                onClick: () => this.actions.onRegenerate?.(),
            });
            toolbarEl.appendChild(regenerateBtn);
            this.buttons.set('regenerate', regenerateBtn);
        }
    }

    private createToolbarButton(config: {
        icon: string;
        label: string;
        tooltip: string;
        onClick: () => void;
    }): HTMLElement {
        const button = document.createElement('button');
        button.className = 'claude-header-button';
        button.innerHTML = `${config.icon}<span>${config.label}</span>`;
        button.setAttribute('aria-label', config.tooltip);

        button.addEventListener('click', config.onClick);

        return button;
    }

    setButtonEnabled(buttonKey: string, enabled: boolean) {
        const button = this.buttons.get(buttonKey);
        if (button) {
            (button as HTMLButtonElement).disabled = !enabled;
            if (enabled) {
                button.classList.remove('claude-header-button-disabled');
            } else {
                button.classList.add('claude-header-button-disabled');
            }
        }
    }

    destroy() {
        // Cleanup if needed
    }
}
