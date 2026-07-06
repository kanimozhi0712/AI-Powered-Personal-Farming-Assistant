import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Download, Mic, Plus, Send, Square, Trash2, UserRound, Volume2 } from 'lucide-react';
import DashboardShell from '../components/DashboardShell.jsx';
import { aiChat } from '../services/api.js';

const suggestions = [
  'Best crops for clay soil?',
  'How to treat rice blast?',
  'When should I irrigate wheat?',
  'Best fertilizer for paddy?',
  'How to increase tomato yield?'
];

const defaultGreeting = { role: 'assistant', text: 'Hello Farmer! I am your AI Farming Assistant. Ask me anything.' };
const storageKey = 'farm_ai_chat_sessions';

function createSession() {
  return {
    id: crypto.randomUUID(),
    title: 'New chat',
    createdAt: new Date().toISOString(),
    messages: [defaultGreeting]
  };
}

export default function AiChatPage() {
  const [language, setLanguage] = useState('English');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState(() => {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return saved.length ? saved : [createSession()];
  });
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return saved[0]?.id;
  });
  const [speechRate, setSpeechRate] = useState(1);
  const [speakingId, setSpeakingId] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const activeSession = useMemo(() => sessions.find((session) => session.id === activeSessionId) || sessions[0], [sessions, activeSessionId]);
  const messages = activeSession?.messages || [defaultGreeting];

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (!activeSessionId && sessions[0]) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, sessions]);

  function updateActiveSession(messagesToSave) {
    setSessions((current) => current.map((session) => {
      if (session.id !== activeSession.id) return session;
      const firstUserMessage = messagesToSave.find((message) => message.role === 'user')?.text;
      return {
        ...session,
        title: firstUserMessage ? firstUserMessage.slice(0, 42) : session.title,
        messages: messagesToSave
      };
    }));
  }

  async function sendMessage(text = input) {
    const message = text.trim();
    if (!message || loading) return;
    const nextMessages = [...messages, { role: 'user', text: message }];
    updateActiveSession(nextMessages);
    setInput('');
    setLoading(true);
    try {
      const { data } = await aiChat({
        message,
        language,
        historyJson: JSON.stringify(nextMessages.slice(-8))
      });
      updateActiveSession([...nextMessages, { role: 'assistant', text: data.answer, provider: data.provider }]);
    } catch (err) {
      const error = err?.response?.data?.error || 'Unable to reach AI service. Check backend and API key.';
      updateActiveSession([...nextMessages, { role: 'assistant', text: error }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function newChat() {
    const session = createSession();
    setSessions((current) => [session, ...current]);
    setActiveSessionId(session.id);
    window.speechSynthesis?.cancel();
    setSpeakingId('');
  }

  function deleteChat(id) {
    const remaining = sessions.filter((session) => session.id !== id);
    const nextSessions = remaining.length ? remaining : [createSession()];
    setSessions(nextSessions);
    setActiveSessionId(nextSessions[0].id);
  }

  function speak(text, id) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.lang = languageToSpeechCode(language);
    utterance.onend = () => setSpeakingId('');
    utterance.onerror = () => setSpeakingId('');
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setSpeakingId('');
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInput((current) => current || 'Voice input is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = languageToSpeechCode(language);
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setInput((current) => `${current} ${transcript}`.trim());
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopVoiceInput() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function downloadChat() {
    const content = messages.map((message) => `${message.role.toUpperCase()}: ${message.text}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSession.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-chat.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function languageToSpeechCode(value) {
    const codes = {
      English: 'en-IN',
      Hindi: 'hi-IN',
      Kannada: 'kn-IN',
      Tamil: 'ta-IN',
      Telugu: 'te-IN',
      Malayalam: 'ml-IN',
      Marathi: 'mr-IN',
      Bengali: 'bn-IN',
      Punjabi: 'pa-IN'
    };
    return codes[value] || 'en-IN';
  }

  return (
    <DashboardShell>
      <section className="ai-chat-layout">
        <aside className="chat-history-panel">
          <button className="btn btn-success w-100" type="button" onClick={newChat}><Plus size={16} /> New Chat</button>
          <span className="history-label">Chat History</span>
          <div className="history-list">
            {sessions.map((session) => (
              <button className={session.id === activeSession.id ? 'active' : ''} type="button" key={session.id} onClick={() => setActiveSessionId(session.id)}>
                <span>{session.title}</span>
                <small>{new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
              </button>
            ))}
          </div>
        </aside>

        <div className="ai-chat-page">
          <header className="ai-chat-header">
            <div>
              <h2><Bot size={24} /> AI Farming Assistant</h2>
              <span>Ask any farming or general question</span>
            </div>
            <div className="chat-tools">
              <select className="form-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option>English</option>
                <option>Hindi</option>
                <option>Kannada</option>
                <option>Tamil</option>
                <option>Telugu</option>
                <option>Malayalam</option>
                <option>Marathi</option>
                <option>Bengali</option>
                <option>Punjabi</option>
              </select>
              <label className="speed-control">
                <span>Speed</span>
                <input type="range" min="0.5" max="1.75" step="0.25" value={speechRate} onChange={(e) => setSpeechRate(Number(e.target.value))} />
                <small>{speechRate}x</small>
              </label>
              <button className="icon-action" type="button" title="Download chat" onClick={downloadChat}><Download size={18} /></button>
              <button className="icon-action danger" type="button" title="Delete chat" onClick={() => deleteChat(activeSession.id)}><Trash2 size={18} /></button>
            </div>
          </header>

          <div className="ai-chat-window">
            {messages.map((message, index) => {
              const id = `${message.role}-${index}`;
              return (
                <article className={`chat-bubble ${message.role}`} key={id}>
                  <div className="chat-avatar">{message.role === 'assistant' ? <Bot size={18} /> : <UserRound size={18} />}</div>
                  <div>
                    <p>{message.text}</p>
                    {message.provider && <small>{message.provider}</small>}
                    {message.role === 'assistant' && (
                      <div className="message-actions">
                        <button type="button" onClick={() => speak(message.text, id)}><Volume2 size={14} /> {speakingId === id ? 'Speaking' : 'Speak'}</button>
                        {speakingId === id && <button type="button" onClick={stopSpeaking}><Square size={14} /> Stop</button>}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
            {loading && <article className="chat-bubble assistant"><div className="chat-avatar"><Bot size={18} /></div><p>Thinking...</p></article>}
          </div>

          <div className="prompt-row">
            {suggestions.map((item) => (
              <button type="button" key={item} onClick={() => sendMessage(item)}>{item}</button>
            ))}
          </div>

          <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
            <button className={`voice-button ${listening ? 'active' : ''}`} type="button" title={listening ? 'Stop voice input' : 'Start voice input'} onClick={listening ? stopVoiceInput : startVoiceInput}>
              {listening ? <Square size={18} /> : <Mic size={18} />}
            </button>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} rows="2" placeholder="Ask any farming question..." />
            <button className="btn btn-success" disabled={loading || !input.trim()}><Send size={18} /></button>
          </form>
        </div>
      </section>
    </DashboardShell>
  );
}
