"use client";

import { useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { Bar, Field, Modal, useToast } from "@/components/ui";
import { ACCOUNT_TYPE_LABEL, AccountIcon, CATEGORY_ICONS, CatDot, FinIcon } from "./FinIcon";
import { ACCOUNT_COLORS } from "@/lib/finance/defaults";
import {
  accountBalance,
  cardUsed,
  centsToInput,
  dayLabel,
  invoice,
  money,
  monthLabel,
  parseMoney,
  payInvoice,
  removeAccount,
  removeCard,
  saveAccount,
  saveCard,
} from "@/lib/finance/logic";
import { toDateKey } from "@/lib/dates";
import { uid } from "@/lib/id";
import type { AccountType, CreditCard, FinAccount, Transaction } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";

// ---------- Linha de lançamento ----------

export function TxRow({ t, onOpen, hide }: { t: Transaction; onOpen: () => void; hide: boolean }) {
  const { s } = useAppState();
  const f = s.finance;
  const cat = f.categories.find((c) => c.id === t.categoryId);
  const card = t.cardId ? f.cards.find((c) => c.id === t.cardId) : undefined;
  const acc = f.accounts.find((a) => a.id === t.accountId);
  const to = f.accounts.find((a) => a.id === t.toAccountId);
  const sign = t.kind === "income" ? "+" : t.kind === "transfer" ? "" : "−";
  const where =
    t.kind === "transfer" ? `${acc?.name ?? "?"} → ${to?.name ?? "?"}` : t.kind === "card_payment" ? `${acc?.name ?? ""} → ${card?.name ?? "cartão"}` : card ? `${card.name} · fatura ${monthLabel(t.invoiceMonth ?? "").split(" ")[0].toLowerCase()}` : (acc?.name ?? "");
  return (
    <button type="button" className="tx-row" onClick={onOpen}>
      {t.kind === "transfer" || t.kind === "card_payment" ? (
        <CatDot icon={t.kind === "card_payment" ? "card" : "repeat"} color="#6a7a8c" />
      ) : (
        <CatDot icon={cat?.icon ?? "other"} color={cat?.color ?? "#6a7a8c"} />
      )}
      <span className="tx-main">
        <span className="tx-title">
          {t.description}
          {t.installment && <em> {t.installment.n}/{t.installment.total}</em>}
        </span>
        <small>
          {cat?.name ? `${cat.name} · ` : ""}
          {where}
          {!t.paid && <b className={`tag ${t.kind === "income" ? "tag-in" : "tag-out"}`}>{t.kind === "income" ? "a receber" : "a pagar"}</b>}
        </small>
      </span>
      <span className={`tx-amount ${t.kind === "income" ? "pos" : t.kind === "expense" ? "neg" : ""}`}>
        {hide ? "•••" : `${sign} ${money(t.amount)}`}
      </span>
    </button>
  );
}

// ---------- Todos os lançamentos ----------

export function AllTxSheet({ open, onClose, txs, onOpen, title }: { open: boolean; onClose: () => void; txs: Transaction[]; onOpen: (id: string) => void; title: string }) {
  const { s } = useAppState();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "expense" | "income" | "pending">("all");
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const list = txs.filter((t) => {
    if (filter === "pending" && t.paid) return false;
    if ((filter === "expense" || filter === "income") && t.kind !== filter) return false;
    if (!q.trim()) return true;
    const cat = s.finance.categories.find((c) => c.id === t.categoryId)?.name ?? "";
    return norm(`${t.description} ${cat} ${t.notes}`).includes(norm(q));
  });
  const days = [...new Set(list.map((t) => t.date))];
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <label className="search">
        <Search size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lançamento" aria-label="Buscar lançamento" />
      </label>
      <div className="chips" style={{ margin: "10px 0 12px" }}>
        {(
          [
            ["all", "Todos"],
            ["expense", "Despesas"],
            ["income", "Receitas"],
            ["pending", "Pendentes"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {l}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="empty">Nenhum lançamento encontrado.</p>}
      {days.map((d) => (
        <div key={d}>
          <div className="day-head">{dayLabel(d)}</div>
          {list
            .filter((t) => t.date === d)
            .map((t) => (
              <TxRow key={t.id} t={t} hide={s.finance.hideValues} onOpen={() => onOpen(t.id)} />
            ))}
        </div>
      ))}
    </Modal>
  );
}

// ---------- Contas ----------

export function AccountsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const [edit, setEdit] = useState<FinAccount | "new" | null>(null);
  const accounts = s.finance.accounts.filter((a) => !a.archived);
  return (
    <Modal open={open} onClose={() => { setEdit(null); onClose(); }} title={edit ? (edit === "new" ? "Nova conta" : "Editar conta") : "Contas"}>
      {edit ? (
        <AccountForm
          key={edit === "new" ? "new" : edit.id}
          account={edit === "new" ? undefined : edit}
          onDone={() => setEdit(null)}
          onRemove={(id) => {
            mutate((d) => removeAccount(d, id));
            toast("Conta removida.");
            setEdit(null);
          }}
        />
      ) : (
        <>
          <ul className="list">
            {accounts.map((a) => (
              <li key={a.id}>
                <button type="button" className="row" style={{ width: "100%", textAlign: "left" }} onClick={() => setEdit(a)}>
                  <span className="acc-dot" style={{ background: a.color }}>
                    <AccountIcon type={a.type} size={18} />
                  </span>
                  <span className="row-main">
                    {a.name}
                    <small>{ACCOUNT_TYPE_LABEL[a.type]}</small>
                  </span>
                  <span className="tx-amount">{money(accountBalance(s.finance, a), s.finance.hideValues)}</span>
                  <Pencil size={16} color="var(--text-2)" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn block" style={{ marginTop: 12 }} onClick={() => setEdit("new")}>
            <Plus size={18} /> Adicionar conta
          </button>
        </>
      )}
    </Modal>
  );
}

function ColorPick({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="chips">
      {ACCOUNT_COLORS.map((c) => (
        <button key={c} type="button" className="color-dot" aria-pressed={value === c} aria-label={`Cor ${c}`} style={{ background: c }} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}

function AccountForm({ account, onDone, onRemove }: { account?: FinAccount; onDone: () => void; onRemove: (id: string) => void }) {
  const { mutate } = useAppState();
  const toast = useToast();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "checking");
  const [initial, setInitial] = useState(account ? centsToInput(account.initialBalance) : "");
  const [negative, setNegative] = useState((account?.initialBalance ?? 0) < 0);
  const [color, setColor] = useState(account?.color ?? ACCOUNT_COLORS[0]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const cents = (parseMoney(initial) ?? 0) * (negative ? -1 : 1);
        mutate((d) => saveAccount(d, { id: account?.id, name: name.trim(), type, initialBalance: cents, color }));
        toast("Conta salva.");
        onDone();
      }}
    >
      <Field label="Nome (ex.: Nubank, Caixa, Carteira)">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Tipo">
        <select className="select" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
          {(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((k) => (
            <option key={k} value={k}>
              {ACCOUNT_TYPE_LABEL[k]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={account ? "Saldo inicial (antes dos lançamentos no NORTE)" : "Saldo atual da conta"}>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" inputMode="decimal" placeholder="0,00" value={initial} onChange={(e) => setInitial(e.target.value)} />
          <button type="button" className="chip" aria-pressed={negative} onClick={() => setNegative((v) => !v)}>
            Negativo
          </button>
        </div>
      </Field>
      <Field label="Cor" group>
        <ColorPick value={color} onChange={setColor} />
      </Field>
      <button type="submit" className="btn primary block">
        Salvar conta
      </button>
      <div className="btn-row" style={{ marginTop: 8 }}>
        <button type="button" className="btn ghost" onClick={onDone}>
          Voltar
        </button>
        {account && (
          <button type="button" className="btn ghost" style={{ marginLeft: "auto", color: "#a12f2f" }} onClick={() => onRemove(account.id)}>
            Remover conta
          </button>
        )}
      </div>
    </form>
  );
}

// ---------- Cartões ----------

export function CardForm({ open, onClose, card }: { open: boolean; onClose: () => void; card?: CreditCard }) {
  return (
    <Modal open={open} onClose={onClose} title={card ? "Editar cartão" : "Novo cartão"}>
      {open && <CardFormInner key={card?.id ?? "new"} card={card} onClose={onClose} />}
    </Modal>
  );
}

function CardFormInner({ card, onClose }: { card?: CreditCard; onClose: () => void }) {
  const { mutate } = useAppState();
  const toast = useToast();
  const [name, setName] = useState(card?.name ?? "");
  const [limit, setLimit] = useState(card ? centsToInput(card.limit) : "");
  const [closing, setClosing] = useState(card?.closingDay ?? 3);
  const [due, setDue] = useState(card?.dueDay ?? 10);
  const [color, setColor] = useState(card?.color ?? "#8a05be");
  const [confirm, setConfirm] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        mutate((d) => saveCard(d, { id: card?.id, name: name.trim(), limit: parseMoney(limit) ?? 0, closingDay: closing, dueDay: due, color }));
        toast("Cartão salvo.");
        onClose();
      }}
    >
      <Field label="Nome do cartão">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank, Inter" required />
      </Field>
      <Field label="Limite">
        <input className="input" inputMode="decimal" placeholder="0,00" value={limit} onChange={(e) => setLimit(e.target.value)} />
      </Field>
      <div className="grid-2">
        <Field label="Dia que fecha">
          <input className="input" type="number" min={1} max={31} value={closing} onChange={(e) => setClosing(Math.max(1, Math.min(31, Number(e.target.value) || 1)))} />
        </Field>
        <Field label="Dia que vence">
          <input className="input" type="number" min={1} max={31} value={due} onChange={(e) => setDue(Math.max(1, Math.min(31, Number(e.target.value) || 1)))} />
        </Field>
      </div>
      <Field label="Cor" group>
        <ColorPick value={color} onChange={setColor} />
      </Field>
      <button type="submit" className="btn primary block">
        Salvar cartão
      </button>
      {card &&
        (!confirm ? (
          <button type="button" className="btn ghost block" style={{ marginTop: 8 }} onClick={() => setConfirm(true)}>
            Remover cartão
          </button>
        ) : (
          <div className="empty" style={{ marginTop: 10 }}>
            <p style={{ margin: "0 0 8px" }}>Se houver compras, o cartão é arquivado e o histórico fica guardado.</p>
            <button
              type="button"
              className="btn danger sm"
              onClick={() => {
                mutate((d) => removeCard(d, card.id));
                onClose();
              }}
            >
              Remover
            </button>
          </div>
        ))}
    </form>
  );
}

export function InvoiceSheet({
  open,
  onClose,
  card,
  month,
  onMonth,
  onOpenTx,
  onEditCard,
}: {
  open: boolean;
  onClose: () => void;
  card?: CreditCard;
  month: string;
  onMonth: (m: string) => void;
  onOpenTx: (id: string) => void;
  onEditCard: () => void;
}) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payAcc, setPayAcc] = useState(s.finance.accounts.find((a) => !a.archived)?.id ?? "");
  if (!card) return null;
  const f = s.finance;
  const inv = invoice(f, card, month);
  const used = cardUsed(f, card);
  const STATUS: Record<string, string> = { open: "Aberta", closed: "Fechada", paid: "Paga", empty: "Sem compras" };
  const [y, m] = month.split("-").map(Number);
  const prev = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const next = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;

  return (
    <Modal open={open} onClose={() => { setPaying(false); onClose(); }} title={card.name}>
      <div className="month-switch" style={{ marginTop: -6 }}>
        <button type="button" className="icon-btn" aria-label="Fatura anterior" onClick={() => onMonth(prev)}>
          ‹
        </button>
        <b>Fatura de {monthLabel(month).toLowerCase()}</b>
        <button type="button" className="icon-btn" aria-label="Próxima fatura" onClick={() => onMonth(next)}>
          ›
        </button>
      </div>
      <div className="card" style={{ marginTop: 8 }}>
        <div className="inv-total">{money(inv.total, f.hideValues)}</div>
        <p className="card-sub" style={{ marginTop: 2 }}>
          <span className={`tag ${inv.overdue ? "tag-out" : inv.status === "paid" ? "tag-in" : ""}`}>{inv.overdue ? "Atrasada" : STATUS[inv.status]}</span> · fecha {dayLabel(inv.closing)} · vence {dayLabel(inv.due)}
        </p>
        {inv.paid > 0 && <p className="card-sub">Pago: {money(inv.paid, f.hideValues)}</p>}
        {card.limit > 0 && (
          <div style={{ marginTop: 10 }}>
            <Bar value={(used / card.limit) * 100} label="Limite usado" />
            <p className="card-sub">
              Limite disponível {money(Math.max(0, card.limit - used), f.hideValues)} de {money(card.limit, f.hideValues)}
            </p>
          </div>
        )}
        {inv.remaining > 0 && !paying && (
          <button
            type="button"
            className="btn primary block"
            style={{ marginTop: 12 }}
            onClick={() => {
              setPayAmount(centsToInput(inv.remaining));
              setPaying(true);
            }}
          >
            Pagar fatura
          </button>
        )}
        {paying && (
          <form
            style={{ marginTop: 12 }}
            onSubmit={(e) => {
              e.preventDefault();
              const cents = parseMoney(payAmount);
              if (!cents || !payAcc) return;
              mutate((d) => payInvoice(d, card.id, month, payAcc, cents, toDateKey()));
              toast("Pagamento da fatura registrado.");
              setPaying(false);
            }}
          >
            <div className="grid-2">
              <Field label="Valor">
                <input className="input" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </Field>
              <Field label="Pagar com">
                <select className="select" value={payAcc} onChange={(e) => setPayAcc(e.target.value)}>
                  {f.accounts.filter((a) => !a.archived).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <button type="submit" className="btn primary block">
              Confirmar pagamento
            </button>
          </form>
        )}
      </div>
      <h3 className="sub-title">Compras ({inv.items.length})</h3>
      {inv.items.length === 0 ? (
        <p className="empty">Nenhuma compra nesta fatura.</p>
      ) : (
        inv.items.map((t) => <TxRow key={t.id} t={t} hide={f.hideValues} onOpen={() => onOpenTx(t.id)} />)
      )}
      <button type="button" className="btn ghost block" style={{ marginTop: 10 }} onClick={onEditCard}>
        <Pencil size={16} /> Editar cartão
      </button>
    </Modal>
  );
}

// ---------- Orçamento e categorias ----------

export function BudgetSheet({ open, onClose, spend }: { open: boolean; onClose: () => void; spend: Map<string | null, number> }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("other");
  const cats = s.finance.categories.filter((c) => c.kind === tab);
  return (
    <Modal open={open} onClose={onClose} title="Categorias e orçamento">
      <div className="seg" style={{ marginBottom: 12 }}>
        <button type="button" role="tab" className="seg-btn" aria-selected={tab === "expense"} onClick={() => setTab("expense")}>
          Despesas
        </button>
        <button type="button" role="tab" className="seg-btn" aria-selected={tab === "income"} onClick={() => setTab("income")}>
          Receitas
        </button>
      </div>
      {tab === "expense" && <p className="card-sub" style={{ marginTop: 0 }}>Defina um limite mensal por categoria (opcional). Deixe vazio para não acompanhar.</p>}
      <ul className="list">
        {cats.map((c) => (
          <li key={c.id} className="row">
            <CatDot icon={c.icon} color={c.color} size={34} />
            <input
              className="input"
              style={{ flex: 1, minWidth: 0 }}
              value={c.name}
              aria-label="Nome da categoria"
              onChange={(e) => mutate((d) => void Object.assign(d.finance.categories.find((x) => x.id === c.id)!, { name: e.target.value }))}
            />
            {tab === "expense" && (
              <input
                className="input"
                style={{ width: 104, flex: "none" }}
                inputMode="decimal"
                placeholder="Limite"
                aria-label={`Orçamento de ${c.name}`}
                defaultValue={c.budget ? centsToInput(c.budget) : ""}
                onBlur={(e) => {
                  const v = parseMoney(e.target.value);
                  mutate((d) => void Object.assign(d.finance.categories.find((x) => x.id === c.id)!, { budget: v || null }));
                }}
              />
            )}
          </li>
        ))}
      </ul>
      <form
        className="card"
        style={{ padding: 12, marginTop: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          mutate((d) => void d.finance.categories.push({ id: uid(), name: newName.trim(), kind: tab, icon: newIcon, color: "#2e6b57", budget: null }));
          setNewName("");
          toast("Categoria criada.");
        }}
      >
        <Field label="Nova categoria">
          <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Pet" />
        </Field>
        <div className="chips" style={{ marginBottom: 10 }}>
          {CATEGORY_ICONS.map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={newIcon === k} aria-label={`Ícone ${k}`} onClick={() => setNewIcon(k)}>
              <FinIcon name={k} size={18} />
            </button>
          ))}
        </div>
        <button type="submit" className="btn block">
          <Plus size={18} /> Criar categoria
        </button>
      </form>
      {tab === "expense" && spend.size > 0 && <p className="card-sub">Os gastos do mês aparecem no cartão “Para onde foi o dinheiro”.</p>}
    </Modal>
  );
}
