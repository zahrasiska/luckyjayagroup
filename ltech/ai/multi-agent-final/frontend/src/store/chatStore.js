import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const API_URL = import.meta.env.VITE_API_URL || 'https://chat.luckyjaya.tech';

/**
 * Chat Store - State management for chat
 * History persisted via HTTP, not localStorage
 */
export const useChatStore = create(
    persist(
        (set, get) => ({
            // Messages (loaded from server on mount)
            messages: [],
            isLoading: false,
            error: null,

            // Voice state
            isListening: false,
            isSpeaking: false,
            transcript: '',

            // Connection state
            isConnected: false,

            // Active Data for Desktop Panel
            activeResult: null,

            // App UI State
            isMaximized: false,

            // Session Management (AI will assign)
            sessionId: null,

            // AI Processing Progress
            progress: null, // { step, message, agent, detail }


            // Actions
            setSessionId: (id) => set({ sessionId: id }),

            // Load history from server
            loadHistory: async () => {
                const sessionId = get().sessionId;
                if (!sessionId) return;

                try {
                    const response = await fetch(`${API_URL}/api/history/${sessionId}`);
                    const data = await response.json();
                    if (data.success) {
                        set({ messages: data.history });
                    }
                } catch (error) {
                    console.error('Failed to load history:', error);
                }
            },

            toggleMaximized: () => set((state) => ({ isMaximized: !state.isMaximized })),

            addMessage: (message) => set((state) => ({
                messages: [...state.messages, {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    ...message,
                }],
            })),

            setLoading: (loading) => set({ isLoading: loading }),
            setError: (error) => set({ error }),

            setListening: (listening) => set({ isListening: listening }),
            setSpeaking: (speaking) => set({ isSpeaking: speaking }),
            setTranscript: (transcript) => set({ transcript }),

            setConnected: (connected) => set({ isConnected: connected }),

            setProgress: (progress) => set({ progress }),
            clearProgress: () => set({ progress: null }),

            clearMessages: async () => {
                const sessionId = get().sessionId;
                if (sessionId) {
                    try {
                        await fetch(`${API_URL}/api/history/${sessionId}`, {
                            method: 'DELETE',
                        });
                    } catch (error) {
                        console.error('Failed to clear history on server:', error);
                    }
                }
                set({
                    messages: [],
                    activeResult: null
                });
            },

            // Add user message and mark as pending
            sendMessage: (text) => {
                const messages = get().messages;
                set({
                    messages: [...messages, {
                        id: Date.now(),
                        role: 'user',
                        content: text,
                        timestamp: new Date().toISOString(),
                    }],
                    isLoading: true,
                    error: null,
                });
            },

            setActiveResult: (result) => set({ activeResult: result }),

            // Add AI response
            receiveMessage: (response) => {
                const messages = get().messages;
                const newMessage = {
                    id: Date.now(),
                    role: 'assistant',
                    content: response.response,
                    agent: response.agent,
                    tool: response.tool,
                    duration: response.duration,
                    timestamp: new Date().toISOString(),
                };

                set({
                    messages: [...messages, newMessage],
                    activeResult: newMessage,
                    isLoading: false,
                });
            },
        }),
        {
            name: 'ltech-chat-session',
            storage: createJSONStorage(() => localStorage),
            // Only persist messages, isMaximized, and sessionId
            partialize: (state) => ({
                messages: state.messages,
                isMaximized: state.isMaximized,
                sessionId: state.sessionId,
            }),
        }
    )
);

export default useChatStore;
