"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check as CheckIcon, ChevronRight, Mic, SendHorizontal, Trash2, User, X } from "lucide-react";
import { Compass } from "@/components/Compass";
import { Hero } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/ui";
import { SCREEN_VERSES } from "@/lib/content";
import { clockTime } from "@/lib/dates";
import { uid } from "@/lib/id";
import { mockReply } from "@/lib/assistant/mock";
import { KIND_META, sanitizeReply, type AssistantReply } from "@/lib/assistant/types";
import type { ChatMessage, ProposedAction } from "@/lib/types";
import { useAppState, useStore } from "@/store/StoreProvider";
import { buildAssistantContext, executeAction } from "@/store/logic";

const QUICK = [
  "Estou no celular. O que posso fazer agora?",
  "Tenho 15 minutos livres",
  "Tenho ovos, pão, queijo, banana e café.",
  "O que falta na minha rotina?",
  "Não consegui fazer uma prioridade",
];

/** Marca o estado como alterado agora (usado na sincronização). */
function touch(s: { updatedAt: number }) {
  s.updatedAt = Date.now();
}

function toChatMessage(r: AssistantReply, offline: boolean): ChatMessage {
  const now = new Date().toISOString();
  return {
    id: uid(),
    role: "assistant",
    text: r.text,
    createdAt: now,
    offline: offline || r.degraded,
    suggestions: r.suggestions?.map((s) => ({
      icon: KIND_META[s.kind].icon,
      label: s.label,
      detail: s.detail,
      minutes: s.minutes,
      href: KIND_META[s.kind].href,
    })),
    actions: r.actions?.map((a) => ({ id: uid(), type: a.type, summary: a.summary, payload: a.payload, status: "proposed", createdAt: now })),
  };
}

export default function Assistente() {
  const { s, mutate } = useAppState();
  const { replace } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(s);
  useEffect(() => {
    stateRef.current = s;
  }, [s]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [s.messages.length, pending]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || pending) return;
    setInput("");
    const history = stateRef.current.messages.slice(-12).map((m) => ({ role: m.role, text: m.text }));
    const context = buildAssistantContext(stateRef.current);
    mutate((d) => void d.messages.push({ id: uid(), role: "user", text, createdAt: new Date().toISOString() }));
    setPending(true);
    let reply: ChatMessage;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, history, context }),
        signal: AbortSignal.timeout(35_000),
      });
      if (!res.ok) throw new Error(String(res.status));
      reply = toChatMessage(sanitizeReply((await res.json()) as AssistantReply, "mock"), false);
    } catch {
      // Sem rede ou servidor fora: responde em modo local para o app continuar útil.
      reply = toChatMessage(sanitizeReply(mockReply(text, context), "mock"), true);
    }
    mutate((d) => void d.messages.push(reply));
    setPending(false);
  };

  const decide = (msgId: string, action: ProposedAction, confirm: boolean) => {
    // Executa sobre uma cópia do estado atual para ter o resultado na mão (e mostrar ao usuário).
    const draft = structuredClone(stateRef.current);
    const msg = draft.messages.find((m) => m.id === msgId);
    const act = msg?.actions?.find((a) => a.id === action.id);
    if (!msg || !act || act.status !== "proposed") return;
    touch(draft);
    if (!confirm) {
      act.status = "rejected";
      replace(draft);
      return;
    }
    const result = executeAction(draft, act);
    act.status = result.ok ? "executed" : "failed";
    act.executedAt = new Date().toISOString();
    // Opções alternativas na mesma resposta: ao confirmar uma, as outras saem.
    if (result.ok) msg.actions?.forEach((a) => a.status === "proposed" && (a.status = "rejected"));
    replace(draft);
    toast(result.message);
  };

  return (
    <>
      <Hero title="Assistente NORTE" sub={<>Transforme o tempo no celular<br />em tempo que vale a pena.</>} quote="Direção para uma vida com propósito." verse={SCREEN_VERSES.assistente} />
      <div className="sheet" style={{ paddingBottom: "calc(var(--nav-h) + var(--safe-b) + 110px)" }}>
        <div className="chat" aria-live="polite">
          {s.messages.length === 0 && (
            <div className="msg-ai">
              <span className="ai-dot">
                <Compass size={30} ring={false} />
              </span>
              <div className="bubble-ai">
                Olá, {s.profile.displayName}! Me diga quanto tempo você tem, o que está sentindo ou o que tem na geladeira. Eu sugiro o próximo passo.
                <div className="quick" style={{ marginTop: 12, flexWrap: "wrap" }}>
                  {QUICK.map((q) => (
                    <button key={q} type="button" className="chip" onClick={() => send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {s.messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div className="msg-user">
                  <div className="bubble-user">{m.text}</div>
                  <span className="user-dot" aria-hidden="true">
                    <User size={22} />
                  </span>
                </div>
                <span className="msg-time">{clockTime(m.createdAt)}</span>
              </div>
            ) : (
              <div key={m.id}>
                <div className="msg-ai">
                  <span className="ai-dot" aria-hidden="true">
                    <Compass size={30} ring={false} />
                  </span>
                  <div className="bubble-ai">
                    {m.text}
                    {m.suggestions?.map((sg, i) => (
                      <button
                        key={i}
                        type="button"
                        className="sugg"
                        onClick={() => (sg.href ? router.push(sg.href) : send(`Quero: ${sg.label}`))}
                      >
                        <span className="row-icon" style={{ width: 28 }}>
                          <Icon name={sg.icon} size={24} />
                        </span>
                        <span className="sugg-main">
                          {sg.label}
                          {sg.detail && <small>{sg.detail}</small>}
                        </span>
                        {sg.minutes != null && <span className="sugg-min">{sg.minutes} min</span>}
                        <ChevronRight size={18} style={{ flex: "none", color: "var(--text-2)" }} />
                      </button>
                    ))}
                    {m.actions?.map((a) => (
                      <div key={a.id} className="proposal">
                        <p>{a.summary}</p>
                        {a.status === "proposed" ? (
                          <div className="btn-row">
                            <button type="button" className="btn primary sm" onClick={() => decide(m.id, a, true)}>
                              <CheckIcon size={16} /> Confirmar
                            </button>
                            <button type="button" className="btn sm" onClick={() => decide(m.id, a, false)}>
                              <X size={16} /> Agora não
                            </button>
                          </div>
                        ) : (
                          <span className="status">
                            {a.status === "executed" ? (
                              <>
                                <CheckIcon size={16} color="var(--green)" /> Salvo
                              </>
                            ) : a.status === "failed" ? (
                              "Não foi possível salvar"
                            ) : (
                              "Não salvo"
                            )}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <span className="msg-time" style={{ display: "block", marginLeft: 56 }}>
                  {clockTime(m.createdAt)}
                  {m.offline ? " · modo offline" : ""}
                </span>
              </div>
            ),
          )}

          {pending && (
            <div className="msg-ai">
              <span className="ai-dot" aria-hidden="true">
                <Compass size={30} ring={false} />
              </span>
              <div className="bubble-ai typing" aria-label="Assistente digitando">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          {s.messages.length > 0 && (
            <div style={{ textAlign: "center" }}>
              <button type="button" className="btn ghost sm" onClick={() => mutate((d) => void (d.messages = []))}>
                <Trash2 size={16} /> Limpar conversa
              </button>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="composer-box">
          <button type="button" className="icon-btn" aria-label="Voz (em breve)" title="Voz em breve" disabled style={{ opacity: 0.7 }}>
            <Mic size={24} color="var(--navy)" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Fale ou escreva para o NORTE"
            aria-label="Mensagem para o NORTE"
            enterKeyHint="send"
          />
          <button type="submit" className="send" aria-label="Enviar" disabled={!input.trim() || pending}>
            <SendHorizontal size={22} />
          </button>
        </div>
      </form>
    </>
  );
}
