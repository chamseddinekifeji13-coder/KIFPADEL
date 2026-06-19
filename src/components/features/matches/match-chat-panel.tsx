"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { sendMatchMessageAction } from "@/modules/matches/actions/send-match-message";
import type { MatchMessage } from "@/modules/matches/messages-repository";

type Props = {
  locale: string;
  matchId: string;
  currentUserId: string;
  currentUserName: string;
  initialMessages: MatchMessage[];
  participantNames: Record<string, string>;
};

export function MatchChatPanel({
  locale,
  matchId,
  currentUserId,
  currentUserName,
  initialMessages,
  participantNames,
}: Props) {
  const [messages, setMessages] = useState<MatchMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef(participantNames);

  useEffect(() => {
    namesRef.current = { ...namesRef.current, ...participantNames, [currentUserId]: currentUserName };
  }, [participantNames, currentUserId, currentUserName]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`match-chat:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            match_id: string;
            sender_id: string;
            body: string;
            created_at: string;
          };

          setMessages((prev) => {
            if (prev.some((message) => message.id === row.id)) {
              return prev;
            }

            const senderName = namesRef.current[row.sender_id] ?? "Joueur";
            return [
              ...prev,
              {
                id: row.id,
                matchId: row.match_id,
                senderId: row.sender_id,
                senderName,
                body: row.body,
                createdAt: row.created_at,
              },
            ];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId]);

  const onSend = async () => {
    const text = draft.trim();
    if (!text || pending) {
      return;
    }

    setError("");
    setPending(true);

    const result = await sendMatchMessageAction({
      locale,
      matchId,
      body: text,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessages((prev) => {
      if (prev.some((message) => message.id === result.messageId)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: result.messageId,
          matchId,
          senderId: currentUserId,
          senderName: currentUserName,
          body: text,
          createdAt: result.createdAt,
        },
      ];
    });

    setDraft("");
  };

  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";

  return (
    <section className="rounded-2xl border border-white/10 bg-surface-elevated overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <MessageCircle className="h-4 w-4 text-[var(--gold)]" />
        <h2 className="text-sm font-bold text-white">
          {locale === "en" ? "Match chat" : "Discussion du match"}
        </h2>
      </div>

      <div
        ref={listRef}
        className="max-h-64 min-h-[8rem] space-y-2 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-white/50 text-center py-6">
            {locale === "en"
              ? "Coordinate balls, exact time, carpool…"
              : "Coordonnez les balles, l'heure exacte, le covoiturage…"}
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={cn("flex flex-col gap-0.5", isMine ? "items-end" : "items-start")}
              >
                <p className="text-[10px] text-white/40 px-1">
                  {isMine ? (locale === "en" ? "You" : "Vous") : message.senderName}
                  {" · "}
                  {new Date(message.createdAt).toLocaleTimeString(dateLocale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    isMine
                      ? "bg-[var(--gold)]/20 text-white rounded-br-md"
                      : "bg-white/10 text-white/90 rounded-bl-md",
                  )}
                >
                  {message.body}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-white/10 p-3 space-y-2">
        {error ? <p className="text-xs text-rose-400">{error}</p> : null}
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            maxLength={500}
            placeholder={
              locale === "en" ? "Write a message…" : "Écrire un message…"
            }
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
            className="flex-1 h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--gold)]/50"
          />
          <button
            type="button"
            disabled={pending || !draft.trim()}
            onClick={() => void onSend()}
            className={cn(
              "tap-target flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              pending || !draft.trim()
                ? "bg-white/10 text-white/40"
                : "bg-[var(--gold)] text-black hover:bg-[var(--gold-light)]",
            )}
            aria-label={locale === "en" ? "Send" : "Envoyer"}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
