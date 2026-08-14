"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CALL_NUMBER, CHAT, CHAT_DISMISSED_KEY, hasCallNumber } from "@/lib/chat";

type Message = { role: "visitor" | "agent"; text: string };

/**
 * Chat bubble and panel (brief §4.4).
 *
 * Appears on a delayed trigger — a random point in the 8–12s window, or 50%
 * scroll depth, whichever lands first. Dismissal persists for the session so a
 * visitor who said no isn't asked again on every page.
 *
 * The Retell agent does not exist yet, so sending is stubbed server-side. The
 * UI is complete and functional; the reply says plainly that nobody has read
 * the message and points at the channels that actually work.
 *
 * Positioning avoids the sticky finance CTA (§10): that sits bottom-centre on
 * mobile and mid-right on desktop, so this sits above it on mobile and in the
 * bottom-right corner on desktop.
 */
export function ChatWidget() {
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  /** Retell chat session — without it every message starts a fresh, amnesiac chat. */
  const [chatId, setChatId] = useState<string | undefined>(undefined);
  /** Whether the last reply came from a stub. Null until the first exchange. */
  const [lastStubbed, setLastStubbed] = useState<boolean | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trigger: whichever of the timer or the scroll threshold fires first.
  useEffect(() => {
    const alreadyDismissed = window.sessionStorage.getItem(CHAT_DISMISSED_KEY) === "1";
    const restore = () => setDismissed(alreadyDismissed);
    restore();
    if (alreadyDismissed) return;

    let fired = false;

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      if (ratio >= CHAT.scrollTriggerRatio) fire();
    };

    function fire() {
      if (fired) return;
      fired = true;
      setArmed(true);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    }

    const delay =
      CHAT.triggerMinMs + Math.random() * (CHAT.triggerMaxMs - CHAT.triggerMinMs);
    const timer = setTimeout(fire, delay);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Keep the newest message in view.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending]);

  const openPanel = useCallback(() => {
    setOpen(true);
    setShowTeaser(false);
    setMessages((m) => (m.length > 0 ? m : [{ role: "agent", text: CHAT.openingMessage }]));
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setArmed(false);
    setOpen(false);
    window.sessionStorage.setItem(CHAT_DISMISSED_KEY, "1");
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setMessages((m) => [...m, { role: "visitor", text }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, chatId }),
      });
      const data = await res.json();
      if (data.chatId) setChatId(data.chatId);
      setLastStubbed(Boolean(data.stubbed));
      setMessages((m) => [
        ...m,
        { role: "agent", text: data.reply ?? CHAT.stubReply },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          text: "That didn't send — sorry. If it's urgent, calling is the surest way to reach us.",
        },
      ]);
    } finally {
      setSending(false);
    }
    // chatId must be a dependency: without it this closure keeps the value from
    // first render (undefined), so every message would open a new Retell chat
    // and the agent would forget everything said before it.
  }, [input, sending, chatId]);

  if (dismissed || !armed) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div
          role="dialog"
          aria-label="Chat with Esteem"
          className="flex h-[min(70vh,520px)] w-[min(calc(100vw-2rem),22rem)] flex-col overflow-hidden rounded-2xl border border-ink-line bg-ink-soft shadow-2xl shadow-black/50"
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ink-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">{CHAT.title}</p>
              <p className="text-[11px] text-neutral-500">{CHAT.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full px-2 text-lg leading-none text-neutral-500 transition hover:text-white"
            >
              ×
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "agent"
                    ? "bg-ink-line text-neutral-200"
                    : "ml-auto bg-accent text-ink"
                }`}
              >
                {m.text}
              </div>
            ))}
            {sending && (
              <div className="max-w-[85%] rounded-2xl bg-ink-line px-3.5 py-2.5 text-sm text-neutral-500">
                …
              </div>
            )}
          </div>

          {/* Fallback: always available, and the only honest option while stubbed. */}
          <div className="shrink-0 border-t border-ink-line px-4 py-3">
            {hasCallNumber() ? (
              <a
                href={`tel:${CALL_NUMBER.e164}`}
                className="flex items-center justify-center gap-2 rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10"
              >
                <span aria-hidden="true">📞</span> Call us instead — {CALL_NUMBER.display}
              </a>
            ) : (
              <Link
                href="/contact"
                className="flex items-center justify-center gap-2 rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10"
              >
                Contact the team instead
              </Link>
            )}

            {lastStubbed === true && process.env.NODE_ENV !== "production" && (
              <p className="mt-2 text-center text-[10px] text-amber-300/80">
                Dev only: Retell not configured — replies are stubbed.
              </p>
            )}
          </div>

          <form
            className="flex shrink-0 items-center gap-2 border-t border-ink-line px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={CHAT.placeholder}
              aria-label="Your message"
              className="min-w-0 flex-1 rounded-full border border-ink-line bg-ink px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || input.trim().length === 0}
              className="shrink-0 rounded-full bg-accent px-4 py-2.5 text-xs font-semibold text-ink transition hover:bg-accent-hover disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Teaser — the opening line, shown once before the panel is opened. */}
      {!open && showTeaser && (
        <div className="flex max-w-[16rem] items-start gap-2 rounded-2xl border border-ink-line bg-ink-soft px-4 py-3 shadow-xl shadow-black/40">
          <button
            type="button"
            onClick={openPanel}
            className="text-left text-sm leading-snug text-neutral-200 hover:text-white"
          >
            {CHAT.openingMessage}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label={CHAT.teaserDismissLabel}
            className="-mr-1 -mt-1 shrink-0 rounded-full px-1.5 text-sm leading-none text-neutral-600 transition hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-ink shadow-lg shadow-black/40 transition hover:bg-accent-hover"
      >
        <span aria-hidden="true">{open ? "×" : "💬"}</span>
      </button>
    </div>
  );
}
