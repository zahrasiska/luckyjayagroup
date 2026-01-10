import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useChatStore } from '../store/chatStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://chat.luckyjaya.tech';
const TENANT_SCHEMA = import.meta.env.VITE_TENANT_SCHEMA || 'u1566482_sparepart';

/**
 * Hook for Socket.IO connection
 */
export function useSocket() {
    const socketRef = useRef(null);
    const { setConnected, receiveMessage, setLoading, setError, sessionId, setSessionId, loadHistory, setProgress, clearProgress } = useChatStore();

    // Initialize socket
    useEffect(() => {
        const socket = io(SOCKET_URL, {
            auth: {
                token: 'demo-token', // TODO: Real auth
            },
            query: {
                tenantSchema: TENANT_SCHEMA,
            },
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            console.log('🔌 Connected to AI server');
            setConnected(true);
        });

        // AI sends session ID on cold start
        socket.on('session-ready', async (data) => {
            console.log('🆔 Session created by AI:', data.sessionId);
            setSessionId(data.sessionId);
            // Load history from server after session is ready
            setTimeout(() => loadHistory(), 500);
        });

        socket.on('disconnect', (reason) => {
            console.log('🔌 Disconnected:', reason);
            setConnected(false);
        });

        socket.on('chat-response', (data) => {
            console.log('📩 Response:', data);
            clearProgress(); // Clear progress when response arrives
            receiveMessage(data);
        });

        socket.on('chat-progress', (data) => {
            console.log('⏳ Progress:', data);
            setProgress(data);
        });

        socket.on('chat-error', (data) => {
            console.error('❌ Error:', data);
            clearProgress(); // Clear progress on error
            setError(data.error);
            setLoading(false);
        });

        socket.on('error', (data) => {
            console.error('❌ Socket error:', data);
            setError(data.message);
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
        };
    }, [setConnected, receiveMessage, setLoading, setError, setSessionId, loadHistory]);

    // Send message
    const sendMessage = useCallback((question) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('chat-message', {
                question,
                sessionId,
                tenantSchema: TENANT_SCHEMA, // Required by backend
                userId: 'web-user',
                userRole: 'user',
            });
        } else {
            setError('Not connected to server');
        }
    }, [setError, sessionId]);

    return {
        socket: socketRef.current,
        sendMessage,
    };
}

export default useSocket;
