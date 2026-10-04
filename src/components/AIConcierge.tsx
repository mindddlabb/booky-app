import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-concierge`;

const SUGGESTIONS = [
  "Best neighborhoods in Lagos for tourists?",
  "Find me an apartment under $50/night",
  "What should I pack for Nigeria?",
  "Tips for a first-time visitor to Abuja",
];

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || "Something went wrong");
    return;
  }

  if (!resp.body) {
    onError("No response stream");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

const AIConcierge = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      const userMsg: Message = { role: "user", content: text.trim() };
      const allMessages = [...messages, userMsg];
      setMessages(allMessages);
      setInput("");
      setIsLoading(true);

      let assistantSoFar = "";
      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      await streamChat({
        messages: allMessages,
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        onError: (msg) => {
          toast.error(msg);
          setIsLoading(false);
        },
      });
    },
    [messages, isLoading]
  );

  return (
    <>
      {/* Floating button - positioned on middle-right edge away from bottom Book Now CTA */}
      <button
        type="button"
        aria-label={isOpen ? "Close AI Concierge" : "Open AI Concierge"}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full shadow-xl border border-white/25 flex items-center justify-center transition-all duration-300 active:scale-95 hover:scale-105"
        style={{
          background: "var(--gradient-primary)",
        }}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-primary-foreground" />
        ) : (
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-4 z-50 w-[calc(100vw-2rem)] max-w-sm bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 fade-in duration-300"
          style={{ height: "min(480px, calc(100dvh - 8rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))" }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center gap-3 border-b border-border"
            style={{ background: "var(--gradient-primary)" }}
          >
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-primary-foreground">
                Booky AI
              </h3>
              <p className="text-xs text-primary-foreground/70">
                Your travel concierge
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">
                    Hey there! 👋
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    I can help you find apartments, explore neighborhoods, and plan your trip.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-xs px-3 py-2.5 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-1.5">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-muted rounded-xl px-3.5 py-2.5 text-base sm:text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="rounded-xl shrink-0 h-11 w-11"
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AIConcierge;
