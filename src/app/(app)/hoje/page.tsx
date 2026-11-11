"use client";

import Link from "next/link";
import { CalendarDays, CalendarPlus, ChevronRight, GraduationCap, Sparkles, Wallet } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Card, CardHead, Check, Cta, HeadLink, useToast } from "@/components/ui";
import { DAILY_VERSES, pickByDay } from "@/lib/content";
import { addDays, greeting, longDate, toDateKey } from "@/lib/dates";
import { useNow } from "@/lib/useNow";
import { useAppState } from "@/store/StoreProvider";
import { dayLabel, money, monthOf, monthSummary, togglePaid, upcomingBills } from "@/lib/finance/logic";
import { useDailyMessage } from "@/lib/faith/useDaily";
import { pickLocalMessage, type Theme } from "@/lib/faith/messages";
import { newEventUrl, useAgenda } from "@/lib/agendaFeed";
import { lessonOfDay } from "@/lib/learn";

export default function Hoje() {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const now = useNow();
  const today = toDateKey(now);
  const tomorrow = addDays(today, 1);
  const f = s.finance;
  const hide = f.hideValues;
  const daily = useDailyMessage();
  const { items, status, error } = useAgenda(s.calendar.icsUrl, 2);
  const todayEvents = items.filter((e) => e.date === today);
  const tomorrowEvents = items.filter((e) => e.date === tomorrow);
  const bills = upcomingBills(f, today, 3).filter((b) => !b.income);
  const billsToday = bills.filter((b) => b.date <= today);
  const sum = monthSummary(f, monthOf(today), today);
  const lesson = lessonOfDay(today);

  // Mensagem ligada ao dia: contas vencendo → mordomia; dia cheio → tempo/paz; senão a mensagem do dia.
  const theme: Theme | undefined = billsToday.length ? "financas" : todayEvents.length >= 3 ? "tempo" : undefined;
  const message = theme ? pickLocalMessage(s.me, today, 0, theme) : daily;

  return (
    <>
      <Hero
        title={`${greeting(now)}, ${s.profile.displayName}`}
        sub={
          <Link href="/agenda" className="hero-sub-link" aria-label={`${longDate(now)} — ver agenda`}>
            {longDate(now)}
            <ChevronRight size={18} strokeWidth={2} style={{ opacity: 0.7 }} />
          </Link>
        }
        quote={s.profile.headerPhrase || null}
        verse={pickByDay(DAILY_VERSES, now)}
      />
      <div className="sheet">
        <Link href="/fe" className="card daily-mini">
          <span className="daily-kicker">
            <Sparkles size={15} /> Mensagem para hoje
          </span>
          <span className="daily-mini-text">{message.text}</span>
          {message.verse && <span className="daily-mini-ref">{message.verse.ref}</span>}
        </Link>

        <Card>
          <CardHead title="Compromissos de hoje" icon={<CalendarDays size={26} />} action={<HeadLink href="/agenda">Ver agenda</HeadLink>} />
          {!s.calendar.icsUrl ? (
            <div className="empty">
              Conecte o seu Google Agenda para ver aqui o que tem hoje. <Link href="/agenda">Conectar agora</Link>
            </div>
          ) : status === "loading" && items.length === 0 ? (
            <p className="empty">Lendo sua agenda…</p>
          ) : (
            <>
              {error && items.length === 0 && <p className="empty">{error}</p>}
              {!error && todayEvents.length === 0 && <p className="empty">Nada marcado para hoje.</p>}
              <ul className="agenda-list">
                {todayEvents.map((e) => (
                  <li key={e.id} className="agenda-item">
                    <span className="agenda-time">{e.time ?? "Dia todo"}</span>
                    <span className="agenda-main">
                      <b>{e.title}</b>
                      {(e.end || e.location) && <small>{[e.end ? `até ${e.end}` : "", e.location ?? ""].filter(Boolean).join(" · ")}</small>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="hoje-foot">
                <small>{tomorrowEvents.length ? `Amanhã: ${tomorrowEvents.length} ${tomorrowEvents.length === 1 ? "compromisso" : "compromissos"}` : "Amanhã está livre"}</small>
                <a className="link" href={newEventUrl(today)} target="_blank" rel="noopener noreferrer">
                  <CalendarPlus size={16} /> Novo
                </a>
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardHead title="Contas" sub={bills.length ? "Vencidas, de hoje e dos próximos 3 dias." : undefined} icon={<Wallet size={26} />} action={<HeadLink href="/financas">Finanças</HeadLink>} />
          {bills.length === 0 ? (
            <p className="empty">Nenhuma conta vencendo. Respire tranquilo.</p>
          ) : (
            <ul className="list">
              {bills.map((b) => (
                <li className="row" key={b.id}>
                  <span className={`bill-date ${b.overdue ? "late" : ""}`}>{b.overdue ? "Atrasada" : b.date === today ? "Hoje" : dayLabel(b.date)}</span>
                  <span className="row-main" style={{ fontSize: 15.5 }}>
                    {b.label}
                    <small>{money(b.amount, hide)}</small>
                  </span>
                  {b.kind === "tx" ? (
                    <Check
                      checked={false}
                      label={`Marcar ${b.label} como paga`}
                      onChange={() => {
                        mutate((d) => togglePaid(d, b.id));
                        toast(`${b.label}: paga.`, () => mutate((d) => togglePaid(d, b.id)));
                      }}
                    />
                  ) : (
                    <Link href="/financas/cartoes" className="btn sm">
                      Ver
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="trio trio-mini">
            <div>
              <small>Saldo hoje</small>
              <b className={sum.balance < 0 ? "neg" : ""}>{money(sum.balance, hide)}</b>
            </div>
            <div>
              <small>Previsto no fim do mês</small>
              <b className={sum.forecast < 0 ? "neg" : ""}>{money(sum.forecast, hide)}</b>
            </div>
          </div>
        </Card>

        <Link href="/aprender" className="card lesson-mini">
          <span className="daily-kicker">
            <GraduationCap size={15} /> Aprender hoje
          </span>
          <b>{lesson.title}</b>
          <small>
            {lesson.ref} — {lesson.action}
          </small>
        </Link>

        <Cta href="/financas" tagline="Quem é fiel no pouco, também é fiel no muito.">
          Lançar um gasto
        </Cta>
      </div>
    </>
  );
}
