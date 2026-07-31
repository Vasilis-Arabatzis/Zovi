"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  id: string;
  senderId: string;
  maskedContent: string;
  flagged: boolean;
  createdAt: string;
}

export function ChatThread({
  orderId,
  currentUserId,
  currentUserLabel,
  otherPartyLabel,
}: {
  orderId: string;
  currentUserId: string;
  currentUserLabel: string;
  otherPartyLabel: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchMessages(): Promise<ChatMessage[] | null> {
    const res = await fetch(`/api/chat/filter?orderId=${orderId}`);
    if (!res.ok) return null;
    const body = await res.json();
    return body.messages;
  }

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      const msgs = await fetchMessages();
      if (!cancelled && msgs) setMessages(msgs);
    }

    tick();
    const interval = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    const res = await fetch("/api/chat/filter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, content: draft }),
    });
    if (res.ok) {
      setDraft("");
      const msgs = await fetchMessages();
      if (msgs) setMessages(msgs);
    }
    setSending(false);
  }

  return (
    <div className="flex h-[500px] flex-col overflow-hidden rounded-xl border bg-surface-container-lowest shadow-sm">
      <div className="flex items-center justify-between border-b bg-surface-container-low px-4 py-3">
        <span className="text-body-sm font-bold text-primary">Order thread — {otherPartyLabel}</span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          Contact details auto-masked
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => {
          const isMine = message.senderId === currentUserId;
          return (
            <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%]">
                <div className="mb-1 flex items-center gap-2 px-1">
                  <span className="text-[10px] uppercase text-on-surface-variant">
                    {isMine ? currentUserLabel : otherPartyLabel}
                  </span>
                  <span className="text-mono-data text-[10px] text-on-surface-variant">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className={`rounded-xl px-4 py-2 text-body-sm shadow-sm ${
                    isMine
                      ? "rounded-br-none bg-primary text-on-primary"
                      : "rounded-bl-none border bg-surface-container-lowest"
                  }`}
                >
                  {message.maskedContent}
                </div>
                {message.flagged && (
                  <p className="mt-1 flex items-center gap-1 px-1 text-[10px] text-destructive-red">
                    <span className="material-symbols-outlined text-[12px]">gpp_maybe</span>
                    Contact details were redacted from this message.
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="text-center text-body-sm text-on-surface-variant">
            No messages yet. Say hello.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a secure message…"
          rows={1}
          className="flex-1 resize-none rounded-lg border bg-transparent px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <Button onClick={send} disabled={sending} className="gap-1.5">
          <span className="material-symbols-outlined text-[18px]">send</span>
          Send
        </Button>
      </div>
    </div>
  );
}
