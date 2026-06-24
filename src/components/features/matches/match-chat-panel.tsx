"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sameOriginApiPath } from "@/lib/url/same-origin-api";
import { cn } from "@/lib/utils/cn";
import type { SendMatchMessageOutcome } from "@/modules/matches/actions/send-match-message";
import type { MatchMessage } from "@/modules/matches/messages-repository";

export type MatchChatPanelLabels = {
  title: string;
  emptyHint: string;
  placeholder: string;
  sendAria: string;
  youLabel: string;
  readOnlyHint: string;
};

type Props = {
  locale: string;
  matchId: string;
  currentUserId: string;
  currentUserName: string;
  initialMessages: MatchMessage[];
  participantNames: Record<string, string>;
  labels: MatchChatPanelLabels;
  readOnly?: boolean;
};

export function MatchChatPanel({
  locale,
  matchId,
  currentUserId,
  currentUserName,
  initialMessages,
  participantNames,
  labels,
  readOnly = false,
}: Props) {
  const [messages, setMessages] = useState<MatchMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef(participantNames);
  const hydratedMatchIdRef = useRef(matchId);

  useEffect(() => {
    namesRef.current = { ...namesRef.current, ...participantNames, [currentUserId]: currentUserName };
  }, [participantNames, currentUserId, currentUserName]);

  // Hydrate uniquement au changement de match — pas après chaque revalidation serveur.
  useEffect(() => {
    if (hydratedMatchIdRef.current !== matchId) {
      hydratedMatchIdRef.current = matchId;
      setMessages(initialMessages);
    }
  }, [matchId, initialMessages]);

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
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[MatchChatPanel] realtime subscribe failed", matchId);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId]);

  const onSend = async () => {
    if (readOnly) {
      return;
    }
    const text = draft.trim();
    if (!text || pending) {
      return;
    }

    setError("");
    setPending(true);

    let result: SendMatchMessageOutcome | null = null;
    try {
      const response = await fetch(sameOriginApiPath("/api/matches/messages"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ matchId, body: text }),
        cache: "no-store",
      });

      if (response.headers.get("content-type")?.includes("application/json")) {
        result = (await response.json()) as SendMatchMessageOutcome;
      }
    } catch (err) {
      console.error("[MatchChatPanel] send failed", err);
    }

    setPending(false);

    if (!result?.ok) {
      setError(result?.error ?? "Envoi impossible. Réessayez.");
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
        <h2 className="text-sm font-bold text-white">{labels.title}</h2>
      </div>

      <div
        ref={listRef}
        className="max-h-64 min-h-[8rem] space-y-2 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-white/50 text-center py-6">{labels.emptyHint}</p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={cn("flex flex-col gap-0.5", isMine ? "items-end" : "items-start")}
              >
                <p className="text-[10px] text-white/40 px-1">
                  {isMine ? labels.youLabel : message.senderName}
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
        {readOnly ? (
          <p className="text-xs text-white/50 text-center py-1">{labels.readOnlyHint}</p>
        ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            maxLength={500}
            placeholder={labels.placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
            className="flex-1 h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-base md:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--gold)]/50 touch-manipulation"
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
            aria-label={labels.sendAria}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        )}
      </div>
    </section>
  );
}
