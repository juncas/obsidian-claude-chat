export class ChatInput {
    private containerEl: HTMLElement;
    private inputWrapperEl: HTMLElement;
    private inputEl: HTMLTextAreaElement;
    private sendButtonEl: HTMLButtonElement;
    private stopButtonEl: HTMLButtonElement | null = null;
    private onSubmit: (command: string) => Promise<void>;
    private onStop: () => void;
    private commandHistory: string[] = [];
    private historyIndex: number = -1;
    private tempInput: string = ''; // Store current input when navigating history

    constructor(
        containerEl: HTMLElement,
        onSubmit: (command: string) => Promise<void>,
        onStop: () => void
    ) {
        this.containerEl = containerEl;
        this.onSubmit = onSubmit;
        this.onStop = onStop;
        this.render();
    }

    private render() {
        const inputContainer = this.containerEl.createEl('div', {
            cls: 'claude-chat-input-container',
        });

        // Create wrapper for flex layout
        this.inputWrapperEl = inputContainer.createEl('div', {
            cls: 'claude-chat-input-wrapper',
        });

        this.inputEl = this.inputWrapperEl.createEl('textarea', {
            cls: 'claude-chat-input',
            attr: {
                placeholder: 'Enter a command for Claude...',
                rows: '1',
            },
        });

        // Auto-resize textarea as user types
        this.inputEl.addEventListener('input', () => {
            this.autoResize();
        });

        // Send button
        this.sendButtonEl = this.inputWrapperEl.createEl('button', {
            cls: 'claude-chat-send-button',
        });

        // Add SVG send icon
        this.sendButtonEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <span>Send</span>
        `;

        // Handle send button click
        this.sendButtonEl.addEventListener('click', () => {
            this.handleSubmit();
        });

        // Handle Enter key (Shift+Enter for new line) and arrow keys for history
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSubmit();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            }
        });

        // Focus input on container click
        inputContainer.addEventListener('click', (e) => {
            if (e.target === inputContainer || e.target === this.inputWrapperEl) {
                this.inputEl.focus();
            }
        });
    }

    private createStopButton() {
        if (this.stopButtonEl) return;

        this.stopButtonEl = this.inputWrapperEl.createEl('button', {
            cls: 'claude-chat-stop-button',
        });

        // Add SVG stop icon
        this.stopButtonEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            </svg>
            <span>Stop</span>
        `;

        // Handle stop button click
        this.stopButtonEl.addEventListener('click', () => {
            this.onStop();
        });
    }

    private removeStopButton() {
        if (this.stopButtonEl) {
            this.stopButtonEl.remove();
            this.stopButtonEl = null;
        }
    }

    private async handleSubmit() {
        const command = this.inputEl.value.trim();
        if (command && !this.sendButtonEl.disabled) {
            // Add to history (avoid duplicates)
            if (this.commandHistory[this.commandHistory.length - 1] !== command) {
                this.commandHistory.push(command);
                // Limit history to 100 commands
                if (this.commandHistory.length > 100) {
                    this.commandHistory.shift();
                }
            }

            this.inputEl.value = '';
            this.autoResize();
            this.historyIndex = -1; // Reset history index
            this.tempInput = '';
            await this.onSubmit(command);
        }
    }

    private navigateHistory(direction: number) {
        if (this.commandHistory.length === 0) return;

        // Save current input on first navigation
        if (this.historyIndex === -1) {
            this.tempInput = this.inputEl.value;
        }

        // Calculate new index
        this.historyIndex += direction;

        // Clamp index to valid range
        if (this.historyIndex < 0) {
            this.historyIndex = 0;
        } else if (this.historyIndex >= this.commandHistory.length) {
            // Restore original input when going past the end
            this.historyIndex = -1;
            this.setValue(this.tempInput);
            return;
        }

        // Set input to history item
        const historyItem = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
        this.setValue(historyItem);

        // Select all text so user can easily type to replace
        this.inputEl.setSelectionRange(0, historyItem.length);
    }

    private autoResize() {
        this.inputEl.style.height = 'auto';
        const newHeight = Math.min(
            Math.max(this.inputEl.scrollHeight, 44),
            140
        );
        this.inputEl.style.height = `${newHeight}px`;
    }

    focus() {
        this.inputEl.focus();
    }

    setDisabled(disabled: boolean) {
        this.inputEl.disabled = disabled;
        this.sendButtonEl.disabled = disabled;
    }

    setProcessing(isProcessing: boolean) {
        if (isProcessing) {
            // Hide send button, show stop button
            this.sendButtonEl.classList.add('claude-hidden');
            this.createStopButton();
            this.inputEl.disabled = true;
        } else {
            // Show send button, hide stop button
            this.sendButtonEl.classList.remove('claude-hidden');
            this.removeStopButton();
            this.inputEl.disabled = false;
        }
    }

    getValue(): string {
        return this.inputEl.value;
    }

    setValue(value: string) {
        this.inputEl.value = value;
        this.autoResize();
    }
}
