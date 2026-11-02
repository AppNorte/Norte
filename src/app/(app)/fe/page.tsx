"use client";

import Link from "next/link";
import { useState } from "react";
import { Check as CheckIcon, Heart, RefreshCw, Share2, Sparkles, X } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Card, CardHead, Cta, HeadLink, Modal, useToast } from "@/components/ui";
import { pickLocalMessage } from "@/lib/faith/messages";
import { useDailyMessage } from "@/lib/faith/useDaily";
import { addDays, dayMonth, toDateKey } from "@/lib/dates";
import { uid } from "@/lib/id";
import type { DailyMessage } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";

function gratitudeStreak(dates: Set<string>, today: string) {
  let n = 0;
  let d = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export default function Fe() {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const today = toDateKey();
  const daily = useDailyMessage();
  const [offset, setOffset] = useState(0);
  const msg: DailyMessage = offset === 0 ? daily : pickLocalMessage(s.me, today, offset);
  const todayGrat = s.faith.gratitude.find((g) => g.date === today);
  const [grat, setGrat] = useState<string[]>(() => [0, 1, 2].map((i) => todayGrat?.items[i] ?? ""));
  const [prayer, setPrayer] = useState("");
  const [modal, setModal] = useState<null | "fav" | "grat" | "answered">(null);
  const [answering, setAnswering] = useState<string | null>(null);
  const [answerNote, setAnswerNote] = useState("");

  const isFav = s.faith.favorites.some((f) => f.text === msg.text);
  const streak = gratitudeStreak(new Set(s.faith.gratitude.map((g) => g.date)), today);
  const open = s.faith.prayers.filter((p) => !p.answeredAt);
  const answered = s.faith.prayers.filter((p) => p.answeredAt);
  const religious = s.me.faith !== "nenhuma";

  const share = async () => {
    const text = `“${msg.text}”${msg.verse ? `\n${msg.verse.text} (${msg.verse.ref})` : ""}\n— NORTE`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Mensagem copiada.");
      }
    } catch {
      /* cancelado */
    }
  };

  return (
    <>
      <Hero title={religious ? "Fé e força" : "Força diária"} sub="Uma palavra para hoje." quote={religious ? { text: "Os que esperam no Senhor renovam as suas forças.", ref: "Isaías 40:31" } : "Um passo de cada vez."} />
      <div className="sheet">
        <Card className="daily-card">
          <div className="daily-kicker">
            <Sparkles size={16} /> Mensagem do dia {msg.source === "ai" && offset === 0 ? "· feita para você" : ""}
          </div>
          <p className="daily-text">{msg.text}</p>
          {msg.verse && (
            <p className="daily-verse">
              “{msg.verse.text}” <cite>{msg.verse.ref}</cite>
            </p>
          )}
          <div className="btn-row" style={{ marginTop: 14 }}>
            <button
              type="button"
              className="btn sm"
              aria-pressed={isFav}
              onClick={() =>
                mutate((d) => {
                  d.faith.favorites = isFav ? d.faith.favorites.filter((f) => f.text !== msg.text) : [msg, ...d.faith.favorites].slice(0, 100);
                })
              }
            >
              <Heart size={16} fill={isFav ? "currentColor" : "none"} /> {isFav ? "Favorita" : "Favoritar"}
            </button>
            <button type="button" className="btn sm" onClick={share}>
              <Share2 size={16} /> Compartilhar
            </button>
            <button type="button" className="btn sm ghost" onClick={() => setOffset((o) => o + 1)}>
              <RefreshCw size={16} /> Outra
            </button>
          </div>
          {!s.me.aiConsent && (
            <p className="card-sub" style={{ marginTop: 12 }}>
              Quer mensagens escritas para você? Preencha <Link className="inline-link" href="/perfil">Meu perfil</Link> e permita o uso pela IA.
            </p>
          )}
        </Card>

        <Card>
          <CardHead title="Gratidão de hoje" sub={streak > 1 ? `${streak} dias seguidos agradecendo.` : "Três coisas boas, mesmo pequenas."} action={<HeadLink onClick={() => setModal("grat")}>Histórico</HeadLink>} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const items = grat.map((x) => x.trim()).filter(Boolean);
              if (!items.length) return;
              mutate((d) => {
                d.faith.gratitude = [...d.faith.gratitude.filter((g) => g.date !== today), { id: uid(), date: today, items }];
              });
              toast("Gratidão registrada.");
            }}
          >
            {grat.map((g, i) => (
              <label key={i} className="field" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="num" aria-hidden="true">
                  {i + 1}
                </span>
                <input
                  className="input"
                  value={g}
                  aria-label={`Gratidão ${i + 1}`}
                  placeholder={["Ex.: café com a família", "Ex.: saúde para trabalhar", "Ex.: uma conversa boa"][i]}
                  onChange={(e) => setGrat((arr) => arr.map((x, k) => (k === i ? e.target.value : x)))}
                />
              </label>
            ))}
            <button type="submit" className="btn primary block">
              {todayGrat ? "Atualizar gratidão" : "Salvar gratidão"}
            </button>
          </form>
        </Card>

        <Card>
          <CardHead
            title={religious ? "Pedidos de oração" : "Intenções"}
            sub={religious ? "Entregue e acompanhe as respostas." : "O que você quer cultivar e acompanhar."}
            action={answered.length ? <HeadLink onClick={() => setModal("answered")}>Respondidos ({answered.length})</HeadLink> : undefined}
          />
          <form
            style={{ display: "flex", gap: 8, marginBottom: 6 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!prayer.trim()) return;
              mutate((d) => void d.faith.prayers.unshift({ id: uid(), text: prayer.trim(), createdAt: new Date().toISOString(), answeredAt: null, answerNote: "" }));
              setPrayer("");
            }}
          >
            <input className="input" value={prayer} onChange={(e) => setPrayer(e.target.value)} placeholder={religious ? "Novo pedido…" : "Nova intenção…"} aria-label="Novo pedido" />
            <button type="submit" className="send" aria-label="Adicionar pedido" style={{ flex: "none" }}>
              <CheckIcon size={20} />
            </button>
          </form>
          {open.length === 0 ? (
            <p className="empty">Nenhum pedido em aberto.</p>
          ) : (
            <ul className="list">
              {open.map((p) => (
                <li className="row" key={p.id}>
                  <span className="row-main" style={{ fontSize: 15.5 }}>
                    {p.text}
                    <small>desde {dayMonth(p.createdAt.slice(0, 10))}</small>
                  </span>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      setAnswering(p.id);
                      setAnswerNote("");
                    }}
                  >
                    {religious ? "Respondido" : "Alcançado"}
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Remover ${p.text}`} onClick={() => mutate((d) => void (d.faith.prayers = d.faith.prayers.filter((x) => x.id !== p.id)))}>
                    <X size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Cta onClick={() => setModal("fav")} tagline="Guarde as palavras que te sustentam.">
          Mensagens favoritas ({s.faith.favorites.length})
        </Cta>
      </div>

      <Modal open={modal === "fav"} onClose={() => setModal(null)} title="Favoritas">
        {s.faith.favorites.length === 0 ? (
          <p className="empty">Toque em “Favoritar” numa mensagem para guardá-la aqui.</p>
        ) : (
          s.faith.favorites.map((f, i) => (
            <div key={i} className="card" style={{ padding: 14 }}>
              <p style={{ margin: 0 }}>{f.text}</p>
              {f.verse && <p className="daily-verse" style={{ fontSize: 14 }}>“{f.verse.text}” <cite>{f.verse.ref}</cite></p>}
            </div>
          ))
        )}
      </Modal>
      <Modal open={modal === "grat"} onClose={() => setModal(null)} title="Histórico de gratidão">
        {s.faith.gratitude.length === 0 ? (
          <p className="empty">Ainda vazio. Comece hoje.</p>
        ) : (
          [...s.faith.gratitude].reverse().map((g) => (
            <div key={g.id} className="card" style={{ padding: 14 }}>
              <div className="day-head" style={{ marginTop: 0 }}>{dayMonth(g.date)}</div>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {g.items.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Modal>
      <Modal open={modal === "answered"} onClose={() => setModal(null)} title={religious ? "Orações respondidas" : "Intenções alcançadas"}>
        {answered.map((p) => (
          <div key={p.id} className="card" style={{ padding: 14 }}>
            <b style={{ fontWeight: 600 }}>{p.text}</b>
            <p className="card-sub">
              {dayMonth(p.createdAt.slice(0, 10))} → {dayMonth(p.answeredAt!.slice(0, 10))}
            </p>
            {p.answerNote && <p style={{ margin: "6px 0 0" }}>{p.answerNote}</p>}
          </div>
        ))}
      </Modal>
      <Modal open={answering !== null} onClose={() => setAnswering(null)} title={religious ? "Glória a Deus!" : "Que bom!"}>
        <p className="card-sub" style={{ marginTop: -6 }}>
          Quer anotar como foi? (opcional)
        </p>
        <textarea className="textarea" value={answerNote} onChange={(e) => setAnswerNote(e.target.value)} aria-label="Como foi respondido" />
        <button
          type="button"
          className="btn primary block"
          style={{ marginTop: 10 }}
          onClick={() => {
            const id = answering;
            mutate((d) => {
              const p = d.faith.prayers.find((x) => x.id === id);
              if (p) {
                p.answeredAt = new Date().toISOString();
                p.answerNote = answerNote.trim();
              }
            });
            setAnswering(null);
            toast(religious ? "Registrado. Guarde esse testemunho." : "Registrado.");
          }}
        >
          Salvar
        </button>
      </Modal>
    </>
  );
}
