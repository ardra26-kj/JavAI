import {
  ArrowUp,
  Check,
  CircleHelp,
  Code2,
  Copy,
  FileText,
  Lightbulb,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendChatMessage } from "./services/chatApi";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  createdAt: Date;
};

const STORAGE_KEY = "javai.conversationId";

const suggestions = [
  {
    icon: Lightbulb,
    title: "Help me brainstorm",
    prompt: "Help me brainstorm ideas for a creative project.",
  },
  {
    icon: Code2,
    title: "Explain a concept",
    prompt: "Explain a complex concept in a simple, approachable way.",
  },
  {
    icon: FileText,
    title: "Write something",
    prompt: "Help me write a clear and thoughtful message.",
  },
];

function createConversationId() {
  return globalThis.crypto?.randomUUID?.() ??
    `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getStoredConversationId() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || createConversationId();
  } catch {
    return createConversationId();
  }
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function App() {
  const [conversationId, setConversationId] = useState(getStoredConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, conversationId);
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  useEffect(
    () => () => activeRequestRef.current?.abort(),
    [],
  );

  const startNewChat = useCallback(() => {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setConversationId(createConversationId());
    setMessages([]);
    setInput("");
    setError(null);
    setFailedMessage(null);
    setIsLoading(false);
    textareaRef.current?.focus();
  }, []);

  const submitMessage = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || activeRequestRef.current) return;

      const requestController = new AbortController();
      activeRequestRef.current = requestController;
      const requestConversationId = conversationId;
      const userMessage: Message = {
        id: createConversationId(),
        role: "user",
        content: message,
        createdAt: new Date(),
      };

      setMessages((current) => [...current, userMessage]);
      setInput("");
      setError(null);
      setFailedMessage(null);
      setIsLoading(true);
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      try {
        const result = await sendChatMessage(
          { conversationId: requestConversationId, message },
          requestController.signal,
        );
        if (activeRequestRef.current !== requestController) return;

        if (result.conversationId && result.conversationId !== requestConversationId) {
          setConversationId(result.conversationId);
        }
        setMessages((current) => [
          ...current,
          {
            id: createConversationId(),
            role: "ai",
            content: result.reply,
            createdAt: new Date(),
          },
        ]);
      } catch (requestError) {
        if (
          requestController.signal.aborted ||
          activeRequestRef.current !== requestController
        ) {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Something went wrong while contacting the chat service.",
        );
        setFailedMessage(message);
      } finally {
        if (activeRequestRef.current === requestController) {
          activeRequestRef.current = null;
          setIsLoading(false);
        }
      }
    },
    [conversationId],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitMessage(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!isLoading && input.trim()) void submitMessage(input);
    }
  };

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  };

  const copyConversationId = async () => {
    try {
      await navigator.clipboard.writeText(conversationId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (copyError) {
      console.error("Could not copy the conversation ID.", copyError);
    }
  };

  return (
    <div className="app-shell min-h-screen">
      <header className="topbar">
        <a className="brand" href="/" aria-label="JavAI home">
          <span className="brand-mark">
            <Sparkles size={17} strokeWidth={2.2} />
          </span>
          <span className="brand-name">Jav<span>AI</span></span>
        </a>

        <div className="header-center">
          <div className="conversation-label">
            <span className="status-dot" />
            <span className="conversation-caption">Conversation</span>
            <span className="conversation-id" title={conversationId}>
              {conversationId}
            </span>
            <button
              className="icon-button copy-button"
              type="button"
              aria-label="Copy conversation ID"
              title="Copy conversation ID"
              onClick={() => void copyConversationId()}
            >
              {copied ? <Check size={14} /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        <button className="new-chat-button" type="button" onClick={startNewChat}>
          <Plus size={16} strokeWidth={2} />
          <span>New chat</span>
        </button>
      </header>

      <main className="chat-layout">
        <div className="chat-content">
          <div className={`messages-scroll ${messages.length ? "has-messages" : ""}`}>
            {messages.length === 0 ? (
              <section className="welcome">
                <div className="welcome-sparkle">
                  <Sparkles size={22} strokeWidth={1.7} />
                </div>
                <p className="eyebrow">A LITTLE SPACE TO THINK</p>
                <h1>Good ideas start<br />with a <span>conversation.</span></h1>
                <p className="welcome-copy">
                  Ask a question, explore a new idea, or just see where the
                  conversation takes you.
                </p>
                <div className="suggestion-grid">
                  {suggestions.map(({ icon: Icon, title, prompt }) => (
                    <button
                      className="suggestion-card"
                      key={title}
                      type="button"
                      onClick={() => {
                        setInput(prompt);
                        textareaRef.current?.focus();
                      }}
                    >
                      <span className="suggestion-icon"><Icon size={17} /></span>
                      <span>{title}</span>
                      <span className="suggestion-arrow">↗</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <div className="message-list">
                {messages.map((message) => (
                  <article
                    className={`message-row ${message.role === "user" ? "user-row" : "ai-row"}`}
                    key={message.id}
                  >
                    {message.role === "ai" && (
                      <span className="assistant-avatar" aria-hidden="true">
                        <Sparkles size={14} />
                      </span>
                    )}
                    <div className="message-column">
                      <div className={`message-bubble ${message.role}-bubble`}>
                        {message.role === "ai" ? (
                          <div className="markdown-content">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                      <time className="message-time" dateTime={message.createdAt.toISOString()}>
                        {formatTime(message.createdAt)}
                      </time>
                    </div>
                  </article>
                ))}

                {isLoading && (
                  <div className="message-row ai-row typing-row" role="status" aria-label="AI is typing">
                    <span className="assistant-avatar" aria-hidden="true">
                      <Sparkles size={14} />
                    </span>
                    <div className="typing-bubble">
                      <span /><span /><span />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="error-banner" role="alert">
                    <div className="error-copy">
                      <CircleHelp size={17} />
                      <span>{error}</span>
                    </div>
                    <div className="error-actions">
                      {failedMessage && (
                        <button
                          type="button"
                          className="retry-button"
                          onClick={() => void submitMessage(failedMessage)}
                        >
                          Try again
                        </button>
                      )}
                      <button
                        type="button"
                        className="icon-button error-dismiss"
                        aria-label="Dismiss error"
                        onClick={() => {
                          setError(null);
                          setFailedMessage(null);
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="composer-wrap">
            <form className="composer" onSubmit={handleSubmit}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  resizeTextarea();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                rows={1}
                aria-label="Message"
                disabled={isLoading}
              />
              <div className="composer-footer">
                <span className="composer-hint">A good question can take you anywhere.</span>
                <div className="send-controls">
                  <span className="keyboard-hint"><kbd>↵</kbd> to send</span>
                  <button
                    className="send-button"
                    type="submit"
                    aria-label="Send message"
                    disabled={isLoading || !input.trim()}
                  >
                    <ArrowUp size={18} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            </form>
            <p className="disclaimer">
              JavAI can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
