import { spawn } from 'child_process';

export class ClaudeProcessManager {
    private process: ReturnType<typeof spawn> | null = null;
    private vaultPath: string;
    private onDataCallback: ((chunk: string) => void) | null = null;
    private onCompleteCallback: (() => void) | null = null;
    private hasReceivedData = false;
    private startTime: number = 0;
    private sessionId: string | null = null; // Store Claude Code's actual session ID
    private static instance: ClaudeProcessManager | null = null;
    private onSessionIdChange: ((sessionId: string | null) => void) | null = null;
    private currentProcessResolver: (() => void) | null = null;
    private currentProcessRejecter: ((error: Error) => void) | null = null;

    private constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
    }

    static getInstance(vaultPath: string): ClaudeProcessManager {
        if (!ClaudeProcessManager.instance) {
            ClaudeProcessManager.instance = new ClaudeProcessManager(vaultPath);
        }
        return ClaudeProcessManager.instance;
    }

    /**
     * Set the callback to be invoked when session ID changes
     */
    setSessionIdChangeCallback(callback: (sessionId: string | null) => void) {
        this.onSessionIdChange = callback;
    }

    /**
     * Set the current session ID (loaded from plugin data)
     */
    setSessionId(sessionId: string | null) {
        this.sessionId = sessionId;
        console.log('ClaudeProcess: Session ID set to:', sessionId || '(none)');
    }

    /**
     * Get the current session ID
     */
    getSessionId(): string | null {
        return this.sessionId;
    }

    resetSession() {
        this.sessionId = null;
        if (this.onSessionIdChange) {
            this.onSessionIdChange(null);
        }
    }

    /**
     * Check if a process is currently running
     */
    isProcessing(): boolean {
        return this.process !== null;
    }

    /**
     * Stop the currently running process
     */
    stopCommand() {
        if (this.process) {
            console.log('ClaudeProcess: Stopping current process...');
            this.cleanup();
            // Resolve the pending promise with a "stopped" state
            if (this.currentProcessResolver) {
                this.currentProcessResolver();
            }
        }
    }

    async executeCommand(
        command: string,
        onData: (chunk: string) => void,
        onComplete: () => void,
        isRetry: boolean = false
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            // Clean up any existing process before starting new one
            this.cleanup();

            // Store the current promise callbacks for this execution
            this.currentProcessResolver = resolve;
            this.currentProcessRejecter = reject;

            this.onDataCallback = onData;
            this.onCompleteCallback = onComplete;
            this.startTime = Date.now();

            console.log('ClaudeProcess: Starting command:', command);
            console.log('ClaudeProcess: Working directory:', this.vaultPath);
            console.log('ClaudeProcess: Session ID:', this.sessionId || '(new session)');
            console.log('ClaudeProcess: Start time:', new Date().toISOString());

            // Build args array
            const args: string[] = [];

            // Use -r (resume) to continue existing session if we have one
            if (this.sessionId) {
                args.push('-r', this.sessionId);
            }

            // Use stream-json format for real-time streaming output
            args.push(
                '-p', // Print mode (non-interactive)
                '--output-format', 'stream-json', // Enable streaming
                '--include-partial-messages', // Include partial chunks
                '--verbose', // Required for stream-json with -p
                command
            );

            console.log('ClaudeProcess: Spawning: claude', args.join(' '));

            // Spawn claude process
            this.process = spawn('claude', args, {
                cwd: this.vaultPath,
                shell: true,
                env: {
                    ...process.env,
                    PATH: process.env.PATH,
                },
                stdio: ['pipe', 'pipe', 'pipe'],
                windowsHide: true,
            });

            if (!this.process.stdout || !this.process.stderr || !this.process.stdin) {
                reject(new Error('Failed to create process stdio'));
                return;
            }

            // Set encoding to UTF-8
            this.process.stdout.setEncoding('utf-8');
            this.process.stderr.setEncoding('utf-8');

            // IMPORTANT: Close stdin to signal that we're done sending input
            this.process.stdin.end();

            // Reset data flag
            this.hasReceivedData = false;

            // Track if we received text_delta (to avoid duplicate output from assistant/result)
            let hasReceivedTextDelta = false;
            // Track if we've already output the assistant message
            let hasOutputAssistantMessage = false;

            // Buffer for incomplete JSON chunks
            let buffer = '';

            // Handle stdout - parse stream-json format
            this.process.stdout.on('data', (data: string | Buffer) => {
                const chunk = data.toString();
                this.hasReceivedData = true;
                const elapsed = Date.now() - this.startTime;

                // Log raw chunk for debugging
                console.log(`ClaudeProcess: Raw chunk (${chunk.length} chars):`, chunk.substring(0, 200));

                // Parse stream-json format
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.trim()) continue;

                    console.log(`ClaudeProcess: Processing line:`, line.substring(0, 200));

                    try {
                        const parsed = JSON.parse(line);
                        console.log(`ClaudeProcess: Parsed JSON type:`, parsed.type);

                        // Handle system type - extract session ID
                        if (parsed.type === 'system' && parsed.session_id) {
                            this.sessionId = parsed.session_id;
                            console.log(`ClaudeProcess: Captured session ID: ${this.sessionId}`);
                            // Notify plugin to persist the session ID
                            if (this.onSessionIdChange) {
                                this.onSessionIdChange(this.sessionId);
                            }
                        }
                        // Handle stream_event with content_block_delta
                        else if (parsed.type === 'stream_event' && parsed.event?.type === 'content_block_delta') {
                            const delta = parsed.event.delta;
                            // Only show text_delta, ignore input_json_delta (tool calls)
                            if (delta?.type === 'text_delta' && delta?.text) {
                                hasReceivedTextDelta = true; // Mark that we've received streaming text
                                console.log(`ClaudeProcess: Streamed text (${delta.text.length} chars, ${elapsed}ms):`, delta.text.substring(0, 50));
                                if (this.onDataCallback) {
                                    this.onDataCallback(delta.text);
                                }
                            } else {
                                console.log(`ClaudeProcess: Skipping delta type:`, delta?.type);
                            }
                        }
                        // Handle assistant type (complete message)
                        // Skip if we already received text_delta to avoid duplicate output
                        else if (parsed.type === 'assistant' && parsed.message?.content && !hasOutputAssistantMessage) {
                            hasOutputAssistantMessage = true;
                            // Only output if we didn't receive text_delta (no streaming occurred)
                            if (!hasReceivedTextDelta) {
                                // Extract text from content blocks
                                for (const block of parsed.message.content) {
                                    if (block.type === 'text' && block.text) {
                                        console.log(`ClaudeProcess: Assistant message text (${block.text.length} chars)`);
                                        if (this.onDataCallback) {
                                            this.onDataCallback(block.text);
                                        }
                                    }
                                }
                            } else {
                                console.log(`ClaudeProcess: Skipping assistant message (text_delta already received)`);
                            }
                        }
                        // Handle result type (final output)
                        // Skip if we already output from streaming or assistant message
                        else if (parsed.type === 'result' && parsed.result && !hasOutputAssistantMessage) {
                            console.log(`ClaudeProcess: Result output (${parsed.result.length} chars)`);
                            if (this.onDataCallback) {
                                this.onDataCallback(parsed.result);
                            }
                        }
                        // Handle message_stop
                        else if (parsed.type === 'stream_event' && parsed.event?.type === 'message_stop') {
                            console.log('ClaudeProcess: Message complete');
                        }
                        // Handle errors
                        else if (parsed.type === 'error') {
                            console.error('ClaudeProcess: Stream error:', parsed.error);
                        } else {
                            console.log(`ClaudeProcess: Unhandled JSON type:`, parsed.type, parsed);
                        }
                    } catch (e) {
                        // Not JSON or incomplete, output as-is
                        console.log(`ClaudeProcess: Not JSON, outputting raw:`, line.substring(0, 100));
                        if (this.onDataCallback) {
                            this.onDataCallback(line);
                        }
                    }
                }
            });

            // Handle stderr
            this.process.stderr.on('data', (data: string | Buffer) => {
                const chunk = data.toString();
                this.hasReceivedData = true;
                const elapsed = Date.now() - this.startTime;
                console.log(`ClaudeProcess: stderr (${chunk.length} chars, ${elapsed}ms):`, chunk.substring(0, 100));

                // Check for session conflict error
                if (chunk.includes('already in use') && chunk.includes('Session ID') && !isRetry) {
                    console.warn('ClaudeProcess: Session conflict detected, retrying with new session');
                    // Notify user about session conflict
                    if (this.onDataCallback) {
                        this.onDataCallback('\n\n⚠️ 检测到会话冲突，正在创建新会话...\n\n');
                    }
                    this.sessionId = null;
                    if (this.onSessionIdChange) {
                        this.onSessionIdChange(null);
                    }
                    // Clean up current process
                    this.cleanup();
                    // Wait a bit for process to fully terminate, then retry
                    setTimeout(() => {
                        this.executeCommand(command, onData, onComplete, true)
                            .then(() => {
                                if (this.currentProcessResolver) this.currentProcessResolver();
                            })
                            .catch((err) => {
                                if (this.currentProcessRejecter) this.currentProcessRejecter(err);
                            });
                    }, 100);
                    return;
                }

                if (this.onDataCallback) {
                    this.onDataCallback(chunk);
                }
            });

            // Handle process completion
            this.process.on('close', (code: number) => {
                const elapsed = Date.now() - this.startTime;
                console.log(`ClaudeProcess: Process closed with code: ${code}, hadData: ${this.hasReceivedData}, ${elapsed}ms total`);
                if (this.onCompleteCallback) {
                    this.onCompleteCallback();
                }
                // Use stored resolver/rejecter instead of closure
                if (code === 0) {
                    if (this.currentProcessResolver) this.currentProcessResolver();
                } else {
                    if (this.hasReceivedData) {
                        console.log('ClaudeProcess: Non-zero exit but data received, resolving');
                        if (this.currentProcessResolver) this.currentProcessResolver();
                    } else {
                        if (this.currentProcessRejecter) this.currentProcessRejecter(new Error(`Process exited with code ${code}`));
                    }
                }
                this.process = null;
            });

            // Handle process exit
            this.process.on('exit', (code: number | null, signal: string | null) => {
                const elapsed = Date.now() - this.startTime;
                console.log(`ClaudeProcess: Process exit - code: ${code}, signal: ${signal}, hadData: ${this.hasReceivedData}, ${elapsed}ms total`);
            });

            // Handle errors
            this.process.on('error', (error: Error) => {
                const elapsed = Date.now() - this.startTime;
                console.error(`ClaudeProcess: Process error after ${elapsed}ms:`, error);
                if (error.message.includes('ENOENT')) {
                    if (this.currentProcessRejecter) this.currentProcessRejecter(new Error('Claude command not found. Please install Claude Code CLI.'));
                } else {
                    if (this.currentProcessRejecter) this.currentProcessRejecter(error);
                }
                this.process = null;
            });

            console.log('ClaudeProcess: Process spawned, PID:', this.process.pid);
        });
    }

    cleanup() {
        if (this.process) {
            const elapsed = Date.now() - this.startTime;
            console.log(`ClaudeProcess: Cleaning up process after ${elapsed}ms`);
            this.process.kill();
            this.process = null;
        }
        // Clear callbacks
        this.onDataCallback = null;
        this.onCompleteCallback = null;
        this.currentProcessResolver = null;
        this.currentProcessRejecter = null;
    }
}
