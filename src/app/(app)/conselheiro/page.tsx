"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { SendHorizontal, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Compass } from "@/components/Compass";
import { Hero } from "@/components/Hero";
import { Card, CardHead } from "@/components/ui";
import { advisorConfigured, askAdvisor, financeSnapshot, type AdvisorTurn } from "@/lib/advisor";
import { useAppState } from "@/store/StoreProvider";
import { useSync } from "@/store/SyncProvider";

const KEY = "norte:advisor-chat";
const QUICK = ["Analise meus gastos deste mês", "Como posso economizar mais?", "Monte um plano para minha reserva de emergência", "Estou com dívida no cartão. Por onde começo?"];

/** Markdown simples da resposta (negrito, listas, parágrafos) sem HTML cru. */
function Rich({ text }: { text: string }) {
  const inline = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>));
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={`l${blocks.length}`}>{list.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>);
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const m = /^(?:[-•*]|\d+[.)])\s+(.*)$/.exec(line);
    if (m) {
      list.push(m[1]);
      continue;
    }
    flush();
    if (!line) continue;
    const h = /^#{1,4}\s+(.*)$/.exec(line);
    blocks.push(h ? <p key={`p${blocks.length}`}><b>{inline(h[1])}</b></p> : <p key={`p${blocks.length}`}>{inline(line)}</p>);
  }
  flush();
  return <div className="rich">{blocks}</div>;
}

export default function Conselheiro() {
  const { s, mutate } = useAppState();
  const sync = useSync();
  const [chat, setChat] = useState<AdvisorTurn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChat(JSON.parse(localStorage.getItem(KEY) || "[]"));
    } catch {}
    void advisorConfigured().then(setReady);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(chat.slice(-20)));
    } catch {}
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat, pending]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || pending) return;
    setInput("");
    setError(null);
    const history = chat.slice(-10);
    setChat((c) => [...c, { role: "user", content: question }]);
    setPending(true);
    try {
      const r = await askAdvisor(question, history, financeSnapshot(s));
      setChat((c) => [...c, { role: "assistant", content: r.answer }]);
      if (r.remaining != null) setRemaining(r.remaining);
    } catch (e) {
      setError((e as Error).message);
      setChat((c) => c.slice(0, -1));
      setInput(question);
    } finally {
      setPending(false);
    }
  };

  const consent = s.me.aiConsent;
  const canAsk = ready && consent && Boolean(sync.user);

  return (
    <>
      <Hero title="Conselheiro" sub="Conselhos financeiros com sabedoria, a partir dos seus números." quote={{ text: "Os planos bem elaborados levam à fartura.", ref: "Provérbios 21:5" }} />
      <div className="sheet" style={{ paddingBottom: "calc(var(--nav-h) + var(--safe-b) + 110px)" }}>
        <div className="chat" aria-live="polite">
          {ready === false && (
            <Card>
              <CardHead title="A IA ainda não foi ligada" icon={<Sparkles size={26} />} />
              <p className="card-sub">Falta colocar a chave da Anthropic (Claude) no servidor do NORTE. Enquanto isso, as lições em <Link href="/aprender">Aprender</Link> continuam disponíveis.</p>
            </Card>
          )}
          {ready && !sync.user && (
            <Card>
              <CardHead title="Entre na sua conta" />
              <p className="card-sub">
                O conselheiro funciona com a sua conta do NORTE. Entre em <Link href="/conta">Conta e backup</Link>.
              </p>
            </Card>
          )}
          {ready && sync.user && !consent && (
            <Card>
              <CardHead title="Permitir que a IA veja seus números?" icon={<ShieldCheck size={26} />} />
              <p className="card-sub">
                Para aconselhar, o NORTE envia à IA (Claude, da Anthropic) um <b>resumo</b> das suas finanças: totais do mês, categorias, maiores gastos, contas a vencer, cartões e objetivos. Não envia senhas,
                fotos nem o extrato completo. Você pode desligar quando quiser em Meu perfil.
              </p>
              <button type="button" className="btn primary block" onClick={() => mutate((d) => void (d.me.aiConsent = true))}>
                Permitir e começar
              </button>
            </Card>
          )}

          {canAsk && chat.length === 0 && (
            <div className="msg-ai">
              <span className="ai-dot">
                <Compass size={30} ring={false} />
              </span>
              <div className="bubble-ai">
                Olá, {s.profile.displayName}! Eu olho os seus números do NORTE e te ajudo a decidir o próximo passo com o dinheiro. O que você quer saber?
                <div className="quick" style={{ marginTop: 12, flexWrap: "wrap" }}>
                  {QUICK.map((q) => (
                    <button key={q} type="button" className="chip" onClick={() => void send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {chat.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="msg-user">
                <div className="bubble-user">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="msg-ai">
                <span className="ai-dot" aria-hidden="true">
                  <Compass size={30} ring={false} />
                </span>
                <div className="bubble-ai">
                  <Rich text={m.content} />
                </div>
              </div>
            ),
          )}

          {pending && (
            <div className="msg-ai">
              <span className="ai-dot" aria-hidden="true">
                <Compass size={30} ring={false} />
              </span>
              <div className="bubble-ai typing" aria-label="Conselheiro pensando">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          {error && (
            <p className="note" role="alert">
              {error}
            </p>
          )}
          {chat.length > 0 && (
            <div style={{ textAlign: "center" }}>
              <button type="button" className="btn ghost sm" onClick={() => setChat([])}>
                <Trash2 size={16} /> Limpar conversa
              </button>
              <p className="field-hint">
                Conselhos gerais com base nos seus números; para decisões grandes, procure também um profissional.{remaining != null ? ` Perguntas restantes hoje: ${remaining}.` : ""}
              </p>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="composer-box">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={canAsk ? "Pergunte sobre o seu dinheiro" : "Conselheiro indisponível"}
            aria-label="Pergunta para o conselheiro"
            enterKeyHint="send"
            disabled={!canAsk}
          />
          <button type="submit" className="send" aria-label="Enviar pergunta" disabled={!canAsk || !input.trim() || pending}>
            <SendHorizontal size={22} />
          </button>
        </div>
      </form>
    </>
  );
}
