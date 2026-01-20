import { ChatMessage } from '../types';
import { MarkdownRenderer, Component, TFile } from 'obsidian';

export class MessageContainer {
    private containerEl: HTMLElement;
    private messagesEl: HTMLElement;
    private currentMessageTextEl: HTMLElement | null = null;
    private currentMessageBuffer: string = '';
    private currentCursorEl: HTMLElement | null = null;
    private currentMessageEl: HTMLElement | null = null;
    private scrollLocked: boolean = false;
    private scrollBottomButton: HTMLElement | null = null;
    private messages: ChatMessage[] = []; // Store all messages for export
    private messageElements: Map<HTMLElement, ChatMessage> = new Map(); // Track message elements
    private onEditMessage?: (index: number, content: string) => void;

    constructor(containerEl: HTMLElement, private app: any) {
        this.containerEl = containerEl;
        this.messagesEl = this.containerEl.createEl('div', { cls: 'claude-chat-messages' });

        // Set up event delegation for link clicks
        this.setupLinkClickHandler();

        // Set up scroll lock detection
        this.setupScrollLock();

        // Set up event delegation for edit button clicks
        this.setupEditHandler();
    }

    setOnEditMessage(callback: (index: number, content: string) => void) {
        this.onEditMessage = callback;
    }

    private setupScrollLock() {
        // Detect when user scrolls away from bottom
        this.messagesEl.addEventListener('scroll', () => {
            const isAtBottom = this.messagesEl.scrollHeight - this.messagesEl.scrollTop <= this.messagesEl.clientHeight + 50;

            if (!isAtBottom && !this.scrollLocked) {
                // User scrolled up, lock auto-scroll
                this.scrollLocked = true;
                this.showScrollBottomButton();
            } else if (isAtBottom && this.scrollLocked) {
                // User scrolled back to bottom, unlock
                this.scrollLocked = false;
                this.hideScrollBottomButton();
            }
        });
    }

    private showScrollBottomButton() {
        if (this.scrollBottomButton) return;

        this.scrollBottomButton = this.containerEl.createEl('button', {
            cls: 'claude-scroll-bottom-button',
        });

        this.scrollBottomButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <span>New messages</span>
        `;

        this.scrollBottomButton.addEventListener('click', () => {
            this.scrollToBottomNow();
        });
    }

    private hideScrollBottomButton() {
        if (this.scrollBottomButton) {
            this.scrollBottomButton.remove();
            this.scrollBottomButton = null;
        }
    }

    private setupLinkClickHandler() {
        // Use event delegation to handle clicks on all links
        this.messagesEl.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;

            // Handle anchor links
            if (target.tagName === 'A') {
                e.preventDefault();
                this.handleLinkClick(target as HTMLAnchorElement);
                return;
            }

            // Handle internal-link class (wiki links)
            if (target.classList.contains('internal-link')) {
                e.preventDefault();
                this.handleInternalLinkClick(target);
                return;
            }
        });
    }

    private handleLinkClick(linkEl: HTMLAnchorElement) {
        const href = linkEl.getAttribute('href');
        if (!href) return;

        // Check if it's an internal link (starts with # or is relative)
        if (href.startsWith('#')) {
            // Anchor link - do nothing or scroll to section
            console.log('Anchor link:', href);
            return;
        }

        // Check if it looks like a file path
        if (href.includes('.md') || href.includes('.png') || href.includes('.jpg')) {
            this.tryOpenFile(href);
            return;
        }

        // External link - open in browser
        window.open(href, '_blank');
    }

    private handleInternalLinkClick(linkEl: HTMLElement) {
        const linkText = linkEl.textContent;
        if (!linkText) return;

        this.tryOpenFile(linkText);
    }

    private tryOpenFile(linkText: string) {
        // Clean up the link text - remove wiki link syntax
        let fileName = linkText
            .replace(/^\[\[/, '')   // Remove opening [[
            .replace(/\]\]$/, '')   // Remove closing ]]
            .replace(/\|.*$/, '')   // Remove alias (everything after |)
            .replace(/#.*/, '')     // Remove heading anchor
            .trim();

        // Try to find the file in the vault
        const metadataCache = this.app.metadataCache;
        const vault = this.app.vault;

        // First, try exact match
        let targetFile = metadataCache.getFirstLinkpathDest(fileName, '');

        // If not found, try with .md extension
        if (!targetFile && !fileName.endsWith('.md')) {
            targetFile = metadataCache.getFirstLinkpathDest(fileName + '.md', '');
        }

        // If still not found, try fuzzy search
        if (!targetFile) {
            const allFiles = vault.getMarkdownFiles();
            targetFile = allFiles.find((file: TFile) => {
                const baseName = file.basename.toLowerCase();
                const searchName = fileName.toLowerCase();
                return baseName === searchName || baseName.includes(searchName);
            });
        }

        if (targetFile instanceof TFile) {
            // Open the file in the main leaf
            this.openFileInMainPane(targetFile);
        } else {
            console.log('File not found:', fileName);
            // Could show a subtle indicator that the file doesn't exist
        }
    }

    private openFileInMainPane(file: TFile) {
        // Get the main workspace leaf (usually the leftmost editor)
        const workspace = this.app.workspace;

        // Try to reuse existing leaf in main area
        let leaf = workspace.getActiveViewOfType('markdown');

        if (!leaf) {
            // If no markdown view is active, get the first leaf in main area
            const mainLeaves = workspace.getLeavesOfType('markdown');
            if (mainLeaves.length > 0) {
                leaf = mainLeaves[0];
            }
        }

        if (leaf) {
            // Reuse the existing leaf
            const leafObj = workspace.getLeafById(leaf.id);
            if (leafObj) {
                leafObj.openFile(file as TFile);
            }
        } else {
            // Fallback: open in new leaf in main area
            (workspace.getLeaf(false) as any).openFile(file as TFile);
        }
    }

    addMessage(message: ChatMessage) {
        // Store message for export (skip system messages like welcome)
        if (message.role !== 'system') {
            this.messages.push(message);
        }

        const messageEl = this.messagesEl.createEl('div', {
            cls: `claude-chat-message claude-chat-message-${message.role}`,
        });

        // Store message element reference for editing
        if (message.role !== 'system') {
            this.messageElements.set(messageEl, message);
            // Store message index as data attribute
            const index = this.messages.length - 1;
            messageEl.dataset.messageIndex = index.toString();
        }

        const contentEl = messageEl.createEl('div', {
            cls: 'claude-chat-message-content',
        });

        const textEl = contentEl.createEl('div', {
            cls: 'claude-chat-message-text',
        });

        textEl.innerHTML = this.formatContent(message.content);

        const timestampEl = messageEl.createEl('div', {
            cls: 'claude-chat-message-timestamp',
        });

        timestampEl.textContent = this.formatTime(message.timestamp);

        // Add copy button for this message (on messageEl to avoid overflow: hidden clip)
        this.addMessageCopyButton(messageEl, message.content);

        // Add edit button for user messages (on messageEl to avoid overflow: hidden clip)
        if (message.role === 'user') {
            this.addEditButton(messageEl);
        }

        this.scrollToBottom();

        return textEl;
    }

    private addMessageCopyButton(messageEl: HTMLElement, content: string) {
        const copyButton = messageEl.createEl('button', {
            cls: 'claude-message-copy-button',
        });

        copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        `;

        copyButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            await navigator.clipboard.writeText(content);

            // Show copied state
            copyButton.classList.add('copied');
            copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;

            setTimeout(() => {
                copyButton.classList.remove('copied');
                copyButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                `;
            }, 2000);
        });
    }

    private setupEditHandler() {
        this.messagesEl.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const editButton = target.closest('.claude-message-edit-button') as HTMLElement;

            if (editButton) {
                e.preventDefault();
                e.stopPropagation();
                const messageEl = editButton.closest('.claude-chat-message') as HTMLElement;
                if (messageEl) {
                    this.enterEditMode(messageEl);
                }
            }
        });
    }

    private addEditButton(messageEl: HTMLElement) {
        const editButton = messageEl.createEl('button', {
            cls: 'claude-message-edit-button',
        });

        editButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
        `;
    }

    private enterEditMode(messageEl: HTMLElement) {
        const textEl = messageEl.querySelector('.claude-chat-message-text') as HTMLElement;
        if (!textEl) return;

        const index = parseInt(messageEl.dataset.messageIndex || '-1');
        if (index < 0) return;

        const message = this.messages[index];
        if (!message) return;

        // Create textarea for editing
        const textarea = textEl.createEl('textarea', {
            cls: 'claude-message-edit-textarea',
        });
        textarea.value = message.content;

        // Create save and cancel buttons
        const buttonContainer = textEl.createEl('div', {
            cls: 'claude-message-edit-buttons',
        });

        const saveButton = buttonContainer.createEl('button', {
            cls: 'claude-message-edit-save',
            text: 'Save & Resend',
        });

        const cancelButton = buttonContainer.createEl('button', {
            cls: 'claude-message-edit-cancel',
            text: 'Cancel',
        });

        // Hide original content
        const originalContent = textEl.querySelectorAll(':scope > :not(textarea):not(.claude-message-edit-buttons)');
        originalContent.forEach(el => (el as HTMLElement).style.display = 'none');

        // Focus textarea
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        // Handle save
        const handleSave = () => {
            const newContent = textarea.value.trim();
            if (newContent && newContent !== message.content) {
                // Update message content
                message.content = newContent;
                textEl.innerHTML = this.formatContent(newContent);
                // Trigger callback to resend
                if (this.onEditMessage) {
                    this.onEditMessage(index, newContent);
                }
            } else {
                // Just exit edit mode without changes
                this.exitEditMode(messageEl, textEl);
            }
        };

        // Handle cancel
        const handleCancel = () => {
            this.exitEditMode(messageEl, textEl);
        };

        saveButton.addEventListener('click', handleSave);
        cancelButton.addEventListener('click', handleCancel);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        });
    }

    private exitEditMode(messageEl: HTMLElement, textEl: HTMLElement) {
        // Remove edit controls
        const textarea = textEl.querySelector('.claude-message-edit-textarea');
        const buttonContainer = textEl.querySelector('.claude-message-edit-buttons');

        if (textarea) textarea.remove();
        if (buttonContainer) buttonContainer.remove();

        // Show original content
        const originalContent = textEl.querySelectorAll(':scope > *');
        originalContent.forEach(el => (el as HTMLElement).style.display = '');
    }

    addUserMessage(content: string): HTMLElement {
        return this.addMessage({
            role: 'user',
            content,
            timestamp: new Date(),
        });
    }

    createAssistantMessage(): HTMLElement {
        const messageEl = this.messagesEl.createEl('div', {
            cls: 'claude-chat-message claude-chat-message-assistant',
        });

        // Store the message element for later use
        this.currentMessageEl = messageEl;

        const contentEl = messageEl.createEl('div', {
            cls: 'claude-chat-message-content',
        });

        const textEl = contentEl.createEl('div', {
            cls: 'claude-chat-message-text',
        });

        // Add thinking indicator initially
        this.addThinkingIndicator(textEl);

        const timestampEl = messageEl.createEl('div', {
            cls: 'claude-chat-message-timestamp',
        });

        timestampEl.textContent = this.formatTime(new Date());

        this.currentMessageTextEl = textEl;
        this.currentMessageBuffer = '';
        this.scrollToBottom();

        return textEl;
    }

    appendToAssistantMessage(text: string) {
        if (this.currentMessageTextEl) {
            // Remove thinking indicator on first append
            this.removeThinkingIndicator();

            this.currentMessageBuffer += text;
            // Show raw text during streaming for performance
            this.currentMessageTextEl.textContent = this.currentMessageBuffer;

            // Add typing cursor
            this.addTypingCursor();

            this.scrollToBottom();
        }
    }

    finalizeAssistantMessage() {
        if (this.currentMessageTextEl) {
            // Remove typing cursor
            this.removeTypingCursor();

            // Render markdown on completion
            if (this.currentMessageBuffer) {
                // Ensure the buffer ends with a newline for proper formatting
                if (!this.currentMessageBuffer.endsWith('\n')) {
                    this.currentMessageBuffer += '\n';
                }
                this.currentMessageTextEl.empty();
                MarkdownRenderer.renderMarkdown(
                    this.currentMessageBuffer,
                    this.currentMessageTextEl,
                    '',
                    new Component()
                );

                // Add copy buttons to code blocks
                this.addCopyButtonsToCodeBlocks(this.currentMessageTextEl);

                // Store assistant message for export
                this.messages.push({
                    role: 'assistant',
                    content: this.currentMessageBuffer,
                    timestamp: new Date(),
                });
            }
        }
        // Add copy button for the entire assistant message (on messageEl to avoid overflow: hidden clip)
        if (this.currentMessageEl) {
            this.addMessageCopyButton(this.currentMessageEl, this.currentMessageBuffer);
        }
        this.currentMessageTextEl = null;
        this.currentMessageBuffer = '';
        this.currentMessageEl = null;
    }

    private addCopyButtonsToCodeBlocks(container: HTMLElement) {
        const codeBlocks = container.querySelectorAll('pre');
        codeBlocks.forEach((pre: HTMLElement) => {
            // Skip if already has a copy button
            if (pre.querySelector('.claude-code-copy-button')) return;

            // Create copy button
            const copyButton = pre.createEl('button', {
                cls: 'claude-code-copy-button',
            });

            copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy</span>
            `;

            // Handle copy click
            copyButton.addEventListener('click', async () => {
                const code = pre.querySelector('code');
                if (code) {
                    const text = code.textContent || '';
                    await navigator.clipboard.writeText(text);

                    // Show copied state
                    copyButton.classList.add('copied');
                    copyButton.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Copied!</span>
                    `;

                    // Reset after 2 seconds
                    setTimeout(() => {
                        copyButton.classList.remove('copied');
                        copyButton.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy</span>
                        `;
                    }, 2000);
                }
            });
        });
    }

    showThinking() {
        if (this.currentMessageTextEl && !this.currentMessageBuffer) {
            this.addThinkingIndicator(this.currentMessageTextEl);
        }
    }

    hideThinking() {
        this.removeThinkingIndicator();
    }

    private addThinkingIndicator(container: HTMLElement) {
        const existingIndicator = container.querySelector('.claude-chat-message-thinking');
        if (existingIndicator) return;

        const thinkingEl = container.createEl('div', {
            cls: 'claude-chat-message-thinking',
        });

        const dotsEl = thinkingEl.createEl('div', {
            cls: 'claude-thinking-dots',
        });

        for (let i = 0; i < 3; i++) {
            dotsEl.createEl('span', {
                cls: 'claude-thinking-dot',
            });
        }

        const textEl = thinkingEl.createEl('span', {
            cls: 'claude-thinking-text',
            text: 'Thinking',
        });
    }

    private removeThinkingIndicator() {
        if (this.currentMessageTextEl) {
            const indicator = this.currentMessageTextEl.querySelector('.claude-chat-message-thinking');
            if (indicator) {
                indicator.remove();
            }
        }
    }

    private addTypingCursor() {
        if (!this.currentMessageTextEl) return;

        this.removeTypingCursor();

        this.currentCursorEl = this.currentMessageTextEl.createEl('span', {
            cls: 'claude-typing-cursor',
        });
    }

    private removeTypingCursor() {
        if (this.currentCursorEl) {
            this.currentCursorEl.remove();
            this.currentCursorEl = null;
        }
    }

    private formatContent(content: string): string {
        // Escape HTML and convert line breaks
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }

    private formatTime(date: Date): string {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    private scrollToBottom() {
        // Only auto-scroll if not locked by user
        if (!this.scrollLocked) {
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        }
    }

    // Public method to force scroll to bottom (for scroll button)
    scrollToBottomNow() {
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        this.scrollLocked = false;
        this.hideScrollBottomButton();
    }

    clear() {
        this.messagesEl.empty();
        this.messages = []; // Clear stored messages
        this.currentMessageTextEl = null;
        this.currentMessageBuffer = '';
        this.scrollLocked = false;
        this.hideScrollBottomButton();
    }

    /**
     * Get all stored messages for export
     */
    getMessages(): ChatMessage[] {
        return [...this.messages];
    }

    /**
     * Remove all messages after a given index (for edit/resend)
     */
    removeMessagesAfter(index: number) {
        // Remove from stored messages
        this.messages = this.messages.slice(0, index + 1);

        // Remove from DOM
        const messageEls = this.messagesEl.querySelectorAll('.claude-chat-message');
        messageEls.forEach((el, i) => {
            if (i > index) {
                el.remove();
            }
        });

        // Update message element references
        this.messageElements.clear();
        const remainingEls = this.messagesEl.querySelectorAll('.claude-chat-message');
        remainingEls.forEach((el, i) => {
            if (i < this.messages.length) {
                this.messageElements.set(el as HTMLElement, this.messages[i]);
                (el as HTMLElement).dataset.messageIndex = i.toString();
            }
        });
    }
}
