import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../store/chatStore';

/**
 * Progress Indicator - Shows AI pipeline steps
 */
function ProgressIndicator() {
    const { progress } = useChatStore();

    // Map pipeline steps to user-friendly messages
    const getStepInfo = () => {
        if (!progress) {
            return { icon: '⏳', message: 'Memproses...', step: 'processing' };
        }

        const { step, message, detail, agent } = progress;

        // Step 1: Routing
        if (step === 'routing_start' || step === 'routing' || (typeof step === 'string' && step.includes('routing'))) {
            return { icon: '🧭', message: 'Menganalisis pertanyaan...', step: 'routing' };
        }

        // Step 2: Specialist Thinking
        if (step === 'specialist_start' || step === 'thinking' || (typeof step === 'string' && step.includes('specialist'))) {
            const agentEmoji = (typeof agent === 'string' && agent.includes('finance')) ? '💰' :
                (typeof agent === 'string' && agent.includes('sales')) ? '📈' :
                    (typeof agent === 'string' && agent.includes('inventory')) ? '📦' : '🤖';
            return { icon: agentEmoji, message: detail || `${agent || 'Specialist'} sedang berpikir...`, step: 'thinking' };
        }

        // Step 3: Summarizing
        if (step === 'summarizing_start' || step === 'summarizing' || (typeof step === 'string' && step.includes('summar'))) {
            return { icon: '✨', message: 'Menyusun ringkasan...', step: 'summarizing' };
        }

        // Step 4: Complete
        if (step === 'complete') {
            return { icon: '✅', message: 'Selesai!', step: 'complete' };
        }

        // Generic fallback
        return { icon: '⏳', message: message || detail || 'Memproses...', step: 'processing' };
    };

    const { icon, message: displayMessage } = getStepInfo();

    return (
        <div className="progress-indicator">
            <motion.div
                className="progress-icon"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
                {icon}
            </motion.div>
            <div className="progress-text">{displayMessage}</div>
            <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    );
}

/**
 * Chat Message Bubble
 */
function ChatBubble({ message }) {
    const isUser = message.role === 'user';
    const { setActiveResult, activeResult } = useChatStore();
    const isActive = activeResult?.id === message.id;

    const previewText = !isUser ? buildPreview(message.content) : message.content;

    return (
        <motion.div
            className={`chat-bubble ${isUser ? 'user' : 'assistant'} ${isActive ? 'active' : ''}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => !isUser && setActiveResult(message)}
            style={{ cursor: !isUser ? 'pointer' : 'default' }}
        >
            <div className="bubble-header">
                {!isUser && message.agent && (
                    <div className="agent-badge">
                        <span className="agent-icon">
                            {(typeof message.agent === 'string' && message.agent.includes('finance')) ? '💰' :
                                (typeof message.agent === 'string' && message.agent.includes('sales')) ? '📈' :
                                    (typeof message.agent === 'string' && message.agent.includes('inventory')) ? '📦' : '🤖'}
                        </span>
                        {message.agent}
                    </div>
                )}

                <div className="bubble-time">
                    {new Date(message.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </div>
            </div>

            <div className="bubble-content">
                {isUser ? (
                    <p className="user-query">{message.content}</p>
                ) : (
                    <div className="history-preview">
                        <span className="preview-prefix">📄</span>
                        {previewText}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/**
 * Simple markdown formatter (tables, bold, etc)
 */
function formatMarkdown(text) {
    if (!text) return '';

    // Escape HTML
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Tables
    html = html.replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        const isHeader = cells.some(c => c.includes('---'));
        if (isHeader) return '';
        const tag = 'td';
        return `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`;
    });

    // Wrap table rows
    if (html.includes('<tr>')) {
        html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/g, '<table class="md-table">$&</table>');
    }

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    // Horizontal rules
    html = html.replace(/---/g, '<hr>');

    // Emojis already work in modern browsers

    return html;
}

function buildPreview(text) {
    if (!text) return '';

    const lines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('|') && !/^[-|]{3,}$/.test(l));

    // 1. Look for the VERY first heading (H1, H2, or H3)
    const firstHeading = lines.find(l => l.startsWith('#'));
    if (firstHeading) {
        return firstHeading.replace(/^#+\s*/, '').replace(/[*_~`]/g, '');
    }

    // 2. If no heading, look for common patterns in ERP responses
    const erpPatterns = [
        /Total (Net )?Sales/i,
        /Neraca/i,
        /Laba Rugi/i,
        /Produk Juara/i,
        /Rekomendasi/i
    ];

    for (const pattern of erpPatterns) {
        const match = lines.find(l => pattern.test(l));
        if (match) return match.replace(/[*_~`]/g, '');
    }

    // 3. Fallback to first meaningful line, heavily truncated
    const firstLine = lines.find(l => l.length > 5) || lines[0] || '';
    const cleanLine = firstLine.replace(/[*_~`]/g, '');

    const maxLen = 60; // Very short for sidebar
    return cleanLine.length > maxLen ? `${cleanLine.slice(0, maxLen)}...` : cleanLine;
}

/**
 * Chat View Component - Shows all messages
 */
export function ChatView() {
    const { messages, isLoading, transcript, isListening } = useChatStore();
    const bottomRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, transcript]);

    return (
        <div className="chat-view">
            <AnimatePresence>
                {messages.map((message) => (
                    <ChatBubble key={message.id} message={message} />
                ))}
            </AnimatePresence>

            {/* Live transcript while speaking */}
            {isListening && transcript && (
                <motion.div
                    className="chat-bubble user live-transcript"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.7 }}
                >
                    <div className="bubble-content">
                        <p>{transcript}</p>
                        <span className="listening-indicator">🎤</span>
                    </div>
                </motion.div>
            )}

            {/* Progress indicator with pipeline steps */}
            {isLoading && (
                <motion.div
                    className="chat-bubble assistant loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <ProgressIndicator />
                </motion.div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}

export default ChatView;
