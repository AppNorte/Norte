"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarCheck2, CalendarPlus, ExternalLink, Link2, MapPin, RefreshCw, Wallet } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Card, CardHead, Field, useToast } from "@/components/ui";
import { addDays, toDateKey } from "@/lib/dates";
import { money } from "@/lib/finance/logic";
import { clearAgendaCache, fetchAgenda, newEventUrl, useAgenda, validIcsUrl, type AgendaEvent } from "@/lib/agendaFeed";
import { upcomingBills, type Bill } from "@/lib/reminders";
import { useAppState } from "@/store/StoreProvider";

const DAYS = 14;

function dayTitle(date: string, today: string) {
  if (date === today) return "Hoje";
  if (date === addDays(today, 1)) return "Amanhã";
  const d = new Date(`${date}T12:00:00`);
  const s = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Agenda() {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const today = toDateKey();
  const url = s.calendar.icsUrl;
  const { items, status, error, at, refresh } = useAgenda(url, DAYS);
  const [showSetup, setShowSetup] = useState(false);
  const bills = upcomingBills(s, today, DAYS - 1).filter((b) => b.kind !== "income");
  const hide = s.finance.hideValues;

  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i));
  const byDay = (d: string) => ({ ev: items.filter((e) => e.date === d), bl: bills.filter((b) => b.date === d) });
  const visibleDays = days.filter((d) => d === today || byDay(d).ev.length || byDay(d).bl.length);

  return (
    <>
      <Hero title="Agenda" sub="Seus compromissos e contas, dia a dia." quote={{ text: "Entregue ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos.", ref: "Provérbios 16:3" }} />
      <div className="sheet">
        {!url || showSetup ? (
          <ConnectCard
            current={url}
            onCancel={url ? () => setShowSetup(false) : undefined}
            onSave={(u) => {
              clearAgendaCache();
              mutate((d) => void (d.calendar.icsUrl = u));
              setShowSetup(false);
              toast("Google Agenda conectado!");
            }}
          />
        ) : (
          <div className="agenda-bar wide">
            <span className="agenda-status">
              <CalendarCheck2 size={18} aria-hidden="true" /> Google Agenda conectado
              {at && <small> · atualizado às {new Date(at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>}
            </span>
            <span className="agenda-btns">
              <button type="button" className="btn sm" onClick={() => void refresh()} disabled={status === "loading"} aria-label="Atualizar agenda">
                <RefreshCw size={16} className={status === "loading" ? "spin" : ""} /> Atualizar
              </button>
              <a className="btn sm primary" href={newEventUrl()} target="_blank" rel="noopener noreferrer">
                <CalendarPlus size={16} /> Novo compromisso
              </a>
            </span>
          </div>
        )}

        {error && (
          <p className="note wide" role="alert">
            {error}
          </p>
        )}

        {visibleDays.map((d) => {
          const { ev, bl } = byDay(d);
          return (
            <Card key={d} className={d === today ? "agenda-today" : ""}>
              <CardHead title={dayTitle(d, today)} sub={d === today ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) : undefined} />
              {ev.length === 0 && bl.length === 0 && <p className="empty">{url ? "Nenhum compromisso hoje. Aproveite com sabedoria." : "Conecte o Google Agenda para ver seus compromissos aqui."}</p>}
              <ul className="agenda-list">
                {ev.map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
                {bl.map((b, i) => (
                  <BillRow key={`b${i}`} b={b} hide={hide} />
                ))}
              </ul>
            </Card>
          );
        })}

        {url && !showSetup && (
          <div className="agenda-foot wide">
            <a className="link" href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">
              Abrir o Google Agenda <ExternalLink size={15} />
            </a>
            <button type="button" className="link" onClick={() => setShowSetup(true)}>
              Trocar endereço
            </button>
            <button
              type="button"
              className="link"
              onClick={() => {
                clearAgendaCache();
                mutate((d) => void (d.calendar.icsUrl = null));
                toast("Google Agenda desconectado do NORTE.");
              }}
            >
              Desconectar
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function EventRow({ e }: { e: AgendaEvent }) {
  return (
    <li className="agenda-item">
      <span className="agenda-time">{e.time ?? "Dia todo"}</span>
      <span className="agenda-main">
        <b>{e.title}</b>
        {(e.end || e.location) && (
          <small>
            {e.end ? `até ${e.end}` : ""}
            {e.end && e.location ? " · " : ""}
            {e.location && (
              <>
                <MapPin size={12} aria-hidden="true" /> {e.location}
              </>
            )}
          </small>
        )}
      </span>
    </li>
  );
}

function BillRow({ b, hide }: { b: Bill; hide: boolean }) {
  return (
    <li className="agenda-item bill-item">
      <span className="agenda-time">
        <Wallet size={16} aria-label="Conta" />
      </span>
      <Link href="/financas" className="agenda-main">
        <b>Pagar: {b.description}</b>
        <small>{b.amount != null ? money(b.amount, hide) : "valor da fatura em Finanças"}</small>
      </Link>
    </li>
  );
}

function ConnectCard({ current, onSave, onCancel }: { current: string | null; onSave: (url: string) => void; onCancel?: () => void }) {
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Card className="wide">
      <CardHead title="Conectar o Google Agenda" sub="O NORTE lê seus compromissos e mostra aqui, na tela Hoje e no aviso da manhã." icon={<Link2 size={26} />} />
      <ol className="steps">
        <li>
          No <b>computador</b>, abra o{" "}
          <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noopener noreferrer">
            Google Agenda → Configurações
          </a>
          .
        </li>
        <li>
          À esquerda, em <b>“Configurações das minhas agendas”</b>, clique na sua agenda (o seu nome).
        </li>
        <li>
          Role até <b>“Integrar agenda”</b> e copie o <b>“Endereço secreto no formato iCal”</b>.
        </li>
        <li>Cole aqui embaixo e toque em Conectar.</li>
      </ol>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const u = validIcsUrl(value);
          if (!u) {
            setErr("Esse não parece o endereço iCal do Google Agenda. Ele começa com https://calendar.google.com/calendar/ical/ e termina com .ics");
            return;
          }
          setBusy(true);
          setErr(null);
          try {
            await fetchAgenda(u, toDateKey(), 1);
            onSave(u);
          } catch (x) {
            setErr((x as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Endereço secreto no formato iCal">
          <input className="input" inputMode="url" autoCapitalize="none" value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" />
        </Field>
        {err && (
          <p className="note" role="alert">
            {err}
          </p>
        )}
        <div className="btn-row">
          {onCancel && (
            <button type="button" className="btn ghost" onClick={onCancel}>
              Cancelar
            </button>
          )}
          <button type="submit" className="btn primary" disabled={busy || !value.trim()} style={{ marginLeft: "auto" }}>
            {busy ? "Conectando…" : "Conectar"}
          </button>
        </div>
      </form>
      <p className="field-hint">
        Esse endereço é pessoal: quem tiver ele consegue ver sua agenda. Ele fica guardado só na sua conta do NORTE. Se um dia quiser cortar o acesso, use “Redefinir” no mesmo lugar do Google Agenda.
      </p>
    </Card>
  );
}
