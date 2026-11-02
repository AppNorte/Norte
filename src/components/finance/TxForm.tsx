"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Field, Modal, Toggle, useToast } from "@/components/ui";
import { CatDot } from "./FinIcon";
import { addDays, toDateKey } from "@/lib/dates";
import { addTransaction, centsToInput, deleteTransaction, money, parseMoney, updateTransaction } from "@/lib/finance/logic";
import type { Transaction, TxKind } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";

type Kind = Exclude<TxKind, "card_payment">;

export function TxForm({ open, onClose, editId, initialKind = "expense" }: { open: boolean; onClose: () => void; editId?: string | null; initialKind?: Kind }) {
  const { s } = useAppState();
  const editing = editId ? s.finance.transactions.find((t) => t.id === editId) : undefined;
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar lançamento" : "Novo lançamento"}>
      {open && <Form key={editId ?? "new"} onClose={onClose} editing={editing} initialKind={initialKind} />}
    </Modal>
  );
}

function Form({ onClose, editing, initialKind }: { onClose: () => void; editing?: Transaction; initialKind: Kind }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const f = s.finance;
  const accounts = f.accounts.filter((a) => !a.archived);
  const cards = f.cards.filter((c) => !c.archived);
  const today = toDateKey();

  const [kind, setKind] = useState<Kind>((editing?.kind as Kind) ?? initialKind);
  const [amount, setAmount] = useState(editing ? centsToInput(editing.amount) : "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  // "acc:<id>" ou "card:<id>"
  const [source, setSource] = useState<string>(
    editing?.cardId ? `card:${editing.cardId}` : `acc:${editing?.accountId ?? accounts[0]?.id ?? ""}`,
  );
  const [toAccount, setToAccount] = useState<string>(editing?.toAccountId ?? accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [date, setDate] = useState(editing?.date ?? today);
  const [paid, setPaid] = useState(editing?.paid ?? true);
  const [installments, setInstallments] = useState(1);
  const [repeat, setRepeat] = useState(false);
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cats = f.categories.filter((c) => c.kind === (kind === "income" ? "income" : "expense"));
  const isCard = kind === "expense" && source.startsWith("card:");
  const cents = parseMoney(amount);
  const sourceId = source.split(":")[1] || null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cents) {
      toast("Informe um valor.");
      return;
    }
    if (kind === "transfer" && (!sourceId || !toAccount || sourceId === toAccount)) {
      toast("Escolha contas de origem e destino diferentes.");
      return;
    }
    const desc = description.trim() || (kind === "transfer" ? "Transferência" : (cats.find((c) => c.id === categoryId)?.name ?? (kind === "income" ? "Receita" : "Despesa")));
    if (editing) {
      mutate((d) =>
        updateTransaction(d, editing.id, {
          amount: cents,
          description: desc,
          categoryId: kind === "transfer" ? null : categoryId,
          date,
          paid: isCard ? true : paid,
          notes,
          accountId: isCard ? null : sourceId,
          cardId: isCard ? sourceId : null,
          toAccountId: kind === "transfer" ? toAccount : null,
        }),
      );
      toast("Lançamento atualizado.");
    } else {
      mutate((d) =>
        addTransaction(d, {
          kind,
          amount: cents,
          date,
          description: desc,
          categoryId,
          accountId: isCard ? null : sourceId,
          toAccountId: toAccount,
          cardId: isCard ? sourceId : null,
          paid: isCard ? true : paid,
          installments: kind === "expense" ? installments : 1,
          repeatMonthly: repeat && installments === 1 && kind !== "transfer",
          notes,
        }),
      );
      toast(installments > 1 ? `Lançado em ${installments}x de ${money(Math.floor(cents / installments))}.` : "Lançamento salvo.");
    }
    onClose();
  };

  return (
    <form onSubmit={submit}>
      {!editing && (
        <div className="seg" role="tablist" aria-label="Tipo de lançamento">
          {(
            [
              ["expense", "Despesa"],
              ["income", "Receita"],
              ["transfer", "Transferência"],
            ] as [Kind, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              className={`seg-btn seg-${k}`}
              onClick={() => {
                setKind(k);
                setCategoryId(null);
                if (k !== "expense" && source.startsWith("card:")) setSource(`acc:${accounts[0]?.id ?? ""}`);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <label className={`money-input money-${kind}`}>
        <span>R$</span>
        <input
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Valor"
          autoFocus={!editing}
        />
      </label>

      <Field label="Descrição">
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={kind === "income" ? "Ex.: Salário" : kind === "transfer" ? "Ex.: Reserva" : "Ex.: Mercado do mês"} />
      </Field>

      {kind !== "transfer" && (
        <Field label="Categoria" group>
          <div className="cat-grid">
            {cats.map((c) => (
              <button key={c.id} type="button" className="cat-chip" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                <CatDot icon={c.icon} color={c.color} size={30} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </Field>
      )}

      {kind === "transfer" ? (
        <div className="grid-2">
          <Field label="De">
            <select className="select" value={sourceId ?? ""} onChange={(e) => setSource(`acc:${e.target.value}`)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Para">
            <select className="select" value={toAccount} onChange={(e) => setToAccount(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : (
        <Field label={kind === "income" ? "Entrar na conta" : "Pagar com"} group>
          <div className="chips">
            {accounts.map((a) => (
              <button key={a.id} type="button" className="chip" aria-pressed={source === `acc:${a.id}`} onClick={() => setSource(`acc:${a.id}`)}>
                <span className="dot" style={{ background: a.color }} />
                {a.name}
              </button>
            ))}
            {kind === "expense" &&
              cards.map((c) => (
                <button key={c.id} type="button" className="chip" aria-pressed={source === `card:${c.id}`} onClick={() => setSource(`card:${c.id}`)}>
                  <span className="dot" style={{ background: c.color }} />
                  {c.name} (cartão)
                </button>
              ))}
          </div>
        </Field>
      )}

      <Field label="Data" group>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input className="input" type="date" aria-label="Data" value={date} onChange={(e) => setDate(e.target.value)} required style={{ flex: 1 }} />
          <button type="button" className="chip" aria-pressed={date === today} onClick={() => setDate(today)}>
            Hoje
          </button>
          <button type="button" className="chip" aria-pressed={date === addDays(today, -1)} onClick={() => setDate(addDays(today, -1))}>
            Ontem
          </button>
        </div>
      </Field>

      {!isCard && (
        <label className="row" style={{ borderBottom: 0, cursor: "pointer" }}>
          <span className="row-main" style={{ fontSize: 15.5 }}>
            {kind === "income" ? "Já recebi" : kind === "transfer" ? "Já transferi" : "Já paguei"}
            <small>Desligue para deixar como {kind === "income" ? "a receber" : "a pagar"}.</small>
          </span>
          <Toggle checked={paid} onChange={() => setPaid((v) => !v)} label="Pago" />
        </label>
      )}

      {!editing && kind === "expense" && (
        <Field label="Parcelas">
          <select className="select" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "À vista" : `${n}x${cents ? ` de ${money(Math.floor(cents / n))}` : ""}`}
              </option>
            ))}
          </select>
        </Field>
      )}

      {!editing && kind !== "transfer" && installments === 1 && (
        <label className="row" style={{ borderBottom: 0, cursor: "pointer" }}>
          <span className="row-main" style={{ fontSize: 15.5 }}>
            Repetir todo mês
            <small>Para contas fixas: aluguel, internet, salário…</small>
          </span>
          <Toggle checked={repeat} onChange={() => setRepeat((v) => !v)} label="Repetir todo mês" />
        </label>
      )}

      <Field label="Observação (opcional)">
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <button type="submit" className="btn primary block">
        {editing ? "Salvar alterações" : "Salvar lançamento"}
      </button>

      {editing && (
        <div style={{ marginTop: 14 }}>
          {!confirmDelete ? (
            <button type="button" className="btn ghost block" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={18} /> Excluir lançamento
            </button>
          ) : (
            <div className="empty">
              <p style={{ margin: "0 0 10px" }}>
                {editing.installment
                  ? `Parcela ${editing.installment.n} de ${editing.installment.total}. O que deseja excluir?`
                  : editing.recurringId
                    ? "Este é um lançamento fixo mensal. O que deseja excluir?"
                    : "Excluir este lançamento?"}
              </p>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn danger sm"
                  onClick={() => {
                    mutate((d) => deleteTransaction(d, editing.id, "one"));
                    toast("Lançamento excluído.");
                    onClose();
                  }}
                >
                  {editing.installment || editing.recurringId ? "Só este" : "Excluir"}
                </button>
                {(editing.installment || editing.recurringId) && (
                  <button
                    type="button"
                    className="btn danger sm"
                    onClick={() => {
                      mutate((d) => deleteTransaction(d, editing.id, "next"));
                      toast(editing.recurringId ? "Lançamento fixo encerrado." : "Parcelas excluídas.");
                      onClose();
                    }}
                  >
                    {editing.recurringId ? "Este e os próximos" : "Esta e as próximas"}
                  </button>
                )}
                <button type="button" className="btn sm" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
