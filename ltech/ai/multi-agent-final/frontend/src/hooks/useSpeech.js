import { useState, useEffect, useCallback, useRef } from 'react';
import { useChatStore } from '../store/chatStore';

/**
 * Hook for Web Speech API - Voice Recognition
 */
export function useSpeechRecognition() {
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef(null);
    const { isListening, setListening, setTranscript } = useChatStore();

    useEffect(() => {
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            setIsSupported(true);

            const recognition = new SpeechRecognition();
            recognition.lang = 'id-ID'; // Indonesian
            recognition.continuous = false;
            recognition.interimResults = true;

            recognition.onstart = () => {
                console.log('🎤 Listening started');
                setListening(true);
            };

            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');

                setTranscript(transcript);

                // If final result, send to callback
                if (event.results[event.results.length - 1].isFinal) {
                    console.log('🎤 Final transcript:', transcript);
                }
            };

            recognition.onerror = (event) => {
                console.error('🎤 Recognition error:', event.error);
                setListening(false);
            };

            recognition.onend = () => {
                console.log('🎤 Listening ended');
                setListening(false);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [setListening, setTranscript]);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            setTranscript('');
            recognitionRef.current.start();
        }
    }, [isListening, setTranscript]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    return {
        isSupported,
        isListening,
        startListening,
        stopListening,
        toggleListening,
    };
}

/**
 * Hook for Web Speech API - Text to Speech
 */
export function useSpeechSynthesis() {
    const [isSupported, setIsSupported] = useState(false);
    const [voices, setVoices] = useState([]);
    const { isSpeaking, setSpeaking } = useChatStore();

    useEffect(() => {
        if ('speechSynthesis' in window) {
            setIsSupported(true);

            const loadVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                // Prioritize Indonesian voices
                const idVoices = availableVoices.filter(v => v.lang.startsWith('id'));
                setVoices(idVoices.length > 0 ? idVoices : availableVoices);
            };

            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const speak = useCallback((text) => {
        if (!isSupported) return;

        // Cancel any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 1;
        utterance.pitch = 1;

        // Use first available Indonesian voice
        if (voices.length > 0) {
            utterance.voice = voices[0];
        }

        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [isSupported, voices, setSpeaking]);

    const stop = useCallback(() => {
        window.speechSynthesis.cancel();
        setSpeaking(false);
    }, [setSpeaking]);

    return {
        isSupported,
        isSpeaking,
        speak,
        stop,
        voices,
    };
}

export default { useSpeechRecognition, useSpeechSynthesis };
