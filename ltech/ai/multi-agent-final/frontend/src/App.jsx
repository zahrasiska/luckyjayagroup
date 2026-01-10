import { useState, useCallback } from 'react';
import { VoiceButton } from './components/VoiceButton';
import { ChatView } from './components/ChatView';
import { DataView } from './components/DataView';
import { useSocket } from './hooks/useSocket';
import { useSpeechSynthesis } from './hooks/useSpeech';
import { useChatStore } from './store/chatStore';
import './App.css';

function App() {
  const [textInput, setTextInput] = useState('');
  const { sendMessage: socketSend } = useSocket();
  const { speak } = useSpeechSynthesis();
  const { sendMessage, isConnected, isLoading, messages, transcript, isMaximized, toggleMaximized, clearMessages } = useChatStore();

  // Handle voice input complete
  const handleVoiceInput = useCallback((text) => {
    if (text.trim()) {
      sendMessage(text);
      socketSend(text);
    }
  }, [sendMessage, socketSend]);

  // Handle text submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim() && !isLoading) {
      sendMessage(textInput);
      socketSend(textInput);
      setTextInput('');
    }
  };

  // Speak last AI response
  const handleSpeak = () => {
    const lastAIMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAIMessage) {
      // Extract plain text from response
      const plainText = lastAIMessage.content
        .replace(/[#*|`]/g, '')
        .replace(/\n+/g, '. ')
        .substring(0, 500);
      speak(plainText);
    }
  };

  return (
    <div className={`app ${isMaximized ? 'maximized' : ''}`}>
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🤖</span>
          <h1>LTECH AI Assistant</h1>
        </div>
        <div className="connection-status">
          <button
            className="clear-button"
            onClick={() => {
              if (window.confirm('Hapus semua riwayat percakapan?')) {
                clearMessages();
              }
            }}
            title="Sesi Baru (Hapus Riwayat)"
          >
            🗑️
          </button>

          <button
            className={`maximize-toggle ${isMaximized ? 'active' : ''}`}
            onClick={toggleMaximized}
            title={isMaximized ? "Tampilan Normal" : "Maksimalkan Data Panel"}
          >
            {isMaximized ? '🗗' : '🗖'}
          </button>

          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="app-body">
        {/* Chat Area (Sidebar on Desktop) */}
        <main className="chat-sidebar chat-container">
          <ChatView />

          {/* Voice Indicator inside chat on mobile, or bottom mobile */}
          {transcript && (
            <div className="transcript-preview">
              <span className="mic-icon">🎤</span>
              {transcript}
            </div>
          )}
        </main>

        {/* Data Panel (Desktop Only) */}
        <section className="data-panel">
          <DataView />
        </section>
      </div>

      {/* Input Area (Pinned to Bottom) */}
      <footer className="input-area">
        <form onSubmit={handleSubmit} className="text-input-form">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Ketik pertanyaan atau tekan tombol voice..."
            disabled={isLoading}
            className="text-input"
          />
          <button
            type="submit"
            disabled={isLoading || !textInput.trim()}
            className="send-button"
          >
            →
          </button>
        </form>

        <div className="voice-controls">
          <VoiceButton onTranscript={handleVoiceInput} />

          <button
            className="speak-button"
            onClick={handleSpeak}
            disabled={messages.length === 0}
            title="Speak last response"
          >
            🔊
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
