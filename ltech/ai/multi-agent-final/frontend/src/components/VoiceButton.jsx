import { motion } from 'framer-motion';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { useChatStore } from '../store/chatStore';

/**
 * Animated Voice Button Component
 */
export function VoiceButton({ onTranscript }) {
    const { isSupported, isListening, toggleListening } = useSpeechRecognition();
    const { transcript, isLoading } = useChatStore();

    if (!isSupported) {
        return (
            <div className="voice-not-supported">
                Browser tidak mendukung voice input
            </div>
        );
    }

    const handleClick = () => {
        if (isListening) {
            // Stop and send transcript
            toggleListening();
            if (transcript && onTranscript) {
                onTranscript(transcript);
            }
        } else {
            toggleListening();
        }
    };

    return (
        <motion.button
            className={`voice-button ${isListening ? 'listening' : ''} ${isLoading ? 'loading' : ''}`}
            onClick={handleClick}
            disabled={isLoading}
            whileTap={{ scale: 0.95 }}
            animate={isListening ? {
                scale: [1, 1.1, 1],
                boxShadow: [
                    '0 0 0 0 rgba(59, 130, 246, 0.5)',
                    '0 0 0 20px rgba(59, 130, 246, 0)',
                    '0 0 0 0 rgba(59, 130, 246, 0)',
                ],
            } : {}}
            transition={isListening ? {
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
            } : {}}
        >
            {isLoading ? (
                <LoadingIcon />
            ) : isListening ? (
                <MicActiveIcon />
            ) : (
                <MicIcon />
            )}
        </motion.button>
    );
}

// Icons
function MicIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
    );
}

function MicActiveIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            <circle cx="12" cy="11" r="2" fill="#ef4444" />
        </svg>
    );
}

function LoadingIcon() {
    return (
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
        </motion.div>
    );
}

export default VoiceButton;
