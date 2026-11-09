"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, CalendarPlus, Send } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Card, CardHead, Field, Toggle, useToast } from "@/components/ui";
import { upcomingMessages } from "@/components/PushRefresher";
import { gcalForRecurring } from "@/lib/calendar";
import { toDateKey } from "@/lib/dates";
import { dateInMonth, money } from "@/lib/finance/logic";
import { disablePush, enablePush, loadPrefs, pushStatus, refreshPush, sendTestPush, type PushStatus } from "@/lib/push";
import { buildNotifications, DEFAULT_PREFS, upcomingBills, type ReminderPrefs } from "@/lib/reminders";
import { useAppState } from "@/store/StoreProvider";
import { syncConfigured, useSync } from "@/store/SyncProvider";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5h às 22h

export default function Avisos() {
  const { s } = useAppState();
  const sync = useSync();
  const toast = useToast();
  const today = toDateKey();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(loadPrefs());
    void pushStatus().then(setStatus);
  }, []);

  const change = (p: Partial<ReminderPrefs>) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    void refreshPush(next, upcomingMessages(s)).catch((e: Error) => setErr(e.message));
  };

  const turnOn = async () => {
    setBusy(true);
    setErr(null);
    try {
      await enablePush(prefs, upcomingMessages(s));
      setStatus("on");
      toast(`Avisos ligados! Chegam todo dia às ${prefs.hour}h.`);
    } catch (e) {
      setErr((e as Error).message);
      setStatus(await pushStatus());
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      await disablePush();
      setStatus("off");
      toast("Avisos desligados neste aparelho.");
    } finally {
      setBusy(false);
    }
  };

  const preview = buildNotifications(s, today, { ...prefs, bills: true, daily: true }, upcomingMessages(s));
  const week = upcomingBills(s, today, 7);
  const fixed = s.finance.recurring.filter((r) => r.active);
  const loggedIn = Boolean(sync.user);

  return (
    <>
      <Hero title="Avisos" sub="Lembretes no celular e no Google Agenda." />
      <div className="sheet">
        <Card>
          <CardHead title="Avisos no celular" sub="Contas a vencer, leitura e o resumo do dia — mesmo com o app fechado." icon={<BellRing size={26} />} />

          {status === "unsupported" && <p className="empty">Este navegador não aceita avisos. No Android, use o Chrome e instale o NORTE na tela inicial.</p>}
          {status === "needs-install" && <p className="empty">No iPhone, primeiro instale o NORTE: Compartilhar → Adicionar à Tela de Início. Depois abra por lá e volte aqui.</p>}
          {status === "denied" && (
            <p className="empty">As notificações do NORTE estão bloqueadas. Libere em Configurações do celular → Apps → Chrome (ou NORTE) → Notificações, e volte aqui.</p>
          )}
          {syncConfigured && !loggedIn && (status === "off" || status === "on") && (
            <p className="empty">
              Para receber avisos, entre na sua conta em <Link href="/conta">Conta e backup</Link>.
            </p>
          )}

          {(status === "off" || status === "on") && (
            <>
              <label className="row" style={{ cursor: "pointer" }}>
                <span className="row-main" style={{ fontSize: 15.5 }}>
                  Receber avisos neste aparelho
                  <small>{status === "on" ? `Ligado · todo dia às ${prefs.hour}h` : "Desligado"}</small>
                </span>
                <Toggle checked={status === "on"} onChange={() => (busy ? undefined : status === "on" ? void turnOff() : void turnOn())} label="Receber avisos neste aparelho" />
              </label>

              <Field label="Horário do aviso">
                <select className="select" value={prefs.hour} onChange={(e) => change({ hour: Number(e.target.value) })}>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </Field>

              <label className="row" style={{ cursor: "pointer" }}>
                <span className="row-main" style={{ fontSize: 15.5 }}>
                  Contas a pagar e receber
                  <small>Luz, internet, faturas, salário…</small>
                </span>
                <Toggle checked={prefs.bills} onChange={() => change({ bills: !prefs.bills })} label="Contas a pagar e receber" />
              </label>
              {prefs.bills && (
                <Field label="Avisar">
                  <select className="select" value={prefs.daysBefore} onChange={(e) => change({ daysBefore: Number(e.target.value) })}>
                    <option value={0}>Só no dia do vencimento</option>
                    <option value={1}>1 dia antes e no dia</option>
                    <option value={3}>Até 3 dias antes</option>
                  </select>
                </Field>
              )}
              <label className="row" style={{ cursor: "pointer", borderBottom: 0 }}>
                <span className="row-main" style={{ fontSize: 15.5 }}>
                  Resumo do dia
                  <small>Leitura de hoje, prioridades, rotina e mensagem de força</small>
                </span>
                <Toggle checked={prefs.daily} onChange={() => change({ daily: !prefs.daily })} label="Resumo do dia" />
              </label>

              {status === "on" && (
                <button
                  type="button"
                  className="btn block"
                  style={{ marginTop: 8 }}
                  disabled={busy}
                  onClick={() =>
                    sendTestPush()
                      .then(() => toast("Aviso de teste enviado. Deve chegar em alguns segundos."))
                      .catch((e: Error) => setErr(e.message))
                  }
                >
                  <Send size={18} /> Enviar aviso de teste
                </button>
              )}
            </>
          )}
          {err && (
            <p className="empty" role="alert" style={{ marginTop: 12 }}>
              {err}
            </p>
          )}
        </Card>

        <Card>
          <CardHead title="Como fica o aviso de hoje" sub="Prévia com os seus dados de agora." />
          {preview.length === 0 ? (
            <p className="empty">Nada para avisar hoje.</p>
          ) : (
            preview.map((m) => (
              <div key={m.tag} className="notif-preview">
                <b>{m.title}</b>
                <span>{m.body}</span>
              </div>
            ))
          )}
          <h3 className="card-sub" style={{ marginTop: 14, fontWeight: 600 }}>
            Próximos 7 dias
          </h3>
          {week.length === 0 ? (
            <p className="empty">Nenhuma conta vencendo. Lance contas com data futura ou marque “Repetir todo mês”.</p>
          ) : (
            <ul className="list">
              {week.map((b, i) => (
                <li key={i} className="row">
                  <span className="row-main">
                    {b.description}
                    <small>{new Date(`${b.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</small>
                  </span>
                  {b.amount != null && <span className={b.kind === "income" ? "pos" : "neg"}>{money(b.amount, s.finance.hideValues)}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHead title="Google Agenda" sub="Toque numa conta fixa: o Google Agenda abre com o lembrete mensal pronto — é só salvar." icon={<CalendarPlus size={26} />} />
          {fixed.length === 0 ? (
            <p className="empty">
              Nenhuma conta fixa ainda. Em <Link href="/financas/transacoes">Finanças</Link>, lance a conta e ligue “Repetir todo mês”. Qualquer lançamento também tem o botão “Lembrar no
              Google Agenda”.
            </p>
          ) : (
            <ul className="list">
              {fixed.map((r) => {
                let first = dateInMonth(today.slice(0, 7), r.day);
                if (first < today) {
                  const [y, m] = today.split("-").map(Number);
                  first = dateInMonth(`${m === 12 ? y + 1 : y}-${String((m % 12) + 1).padStart(2, "0")}`, r.day);
                }
                return (
                  <li key={r.id} className="row">
                    <span className="row-main">
                      {r.description || "Conta fixa"}
                      <small>
                        Todo dia {r.day} · {money(r.amount, s.finance.hideValues)}
                      </small>
                    </span>
                    <a className="btn sm" href={gcalForRecurring(r, first)} target="_blank" rel="noopener noreferrer" aria-label={`Adicionar ${r.description} ao Google Agenda`}>
                      <CalendarPlus size={16} /> Agenda
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
