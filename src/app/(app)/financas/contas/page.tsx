"use client";

import { useState } from "react";
import { Archive, SlidersHorizontal } from "lucide-react";
import { Card, Cta, Field, Modal, Toggle, useToast } from "@/components/ui";
import { ACCOUNT_TYPE_LABEL } from "@/components/finance/FinIcon";
import { BankBadge, BankPicker, FinanceShell, MonthSwitch, useFinMonth } from "@/components/finance/Shell";
import { BANKS, bankOf, guessBank } from "@/lib/finance/banks";
import { accountBalance, accountForecast, adjustBalance, centsToInput, dateInMonth, daysInMonth, money, parseMoney, removeAccount, saveAccount } from "@/lib/finance/logic";
import type { AccountType, FinAccount } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";

export default function Contas() {
  const { s } = useAppState();
  const f = s.finance;
  const hide = f.hideValues;
  const [month, setMonth] = useFinMonth();
  const [edit, setEdit] = useState<FinAccount | "new" | null>(null);
  const [adjust, setAdjust] = useState<FinAccount | null>(null);
  const end = dateInMonth(month, daysInMonth(month));
  const accounts = f.accounts.filter((a) => !a.archived);
  const included = accounts.filter((a) => a.includeInTotal !== false);
  const total = included.reduce((a, x) => a + accountBalance(f, x), 0);
  const totalPrev = included.reduce((a, x) => a + accountForecast(f, x, end), 0);

  return (
    <FinanceShell sub="Bancos, carteira e investimentos.">
      <MonthSwitch month={month} onChange={setMonth} />
      <div className="totals-bar two">
        <span>
          <small>Saldo em contas</small>
          <b className={total < 0 ? "neg" : ""}>{money(total, hide)}</b>
        </span>
        <span>
          <small>Previsto no fim do mês</small>
          <b className={totalPrev < 0 ? "neg" : ""}>{money(totalPrev, hide)}</b>
        </span>
      </div>
      <Card>
        {accounts.length === 0 && <p className="empty">Nenhuma conta. Adicione seus bancos e a carteira.</p>}
        <ul className="list">
          {accounts.map((a) => {
            const bal = accountBalance(f, a);
            const prev = accountForecast(f, a, end);
            return (
              <li key={a.id} className="acc-row">
                <button type="button" className="acc-main" onClick={() => setEdit(a)}>
                  <BankBadge bank={a.bank} type={a.type} color={a.color} size={44} />
                  <span style={{ minWidth: 0 }}>
                    <b>{a.name}</b>
                    <small>
                      {ACCOUNT_TYPE_LABEL[a.type]}
                      {a.includeInTotal === false ? " · fora do total" : ""}
                    </small>
                  </span>
                </button>
                <span className="acc-vals">
                  <b className={bal < 0 ? "neg" : ""}>{money(bal, hide)}</b>
                  {prev !== bal && <small>prev. {money(prev, hide)}</small>}
                </span>
                <button type="button" className="icon-btn" aria-label={`Ajustar saldo de ${a.name}`} onClick={() => setAdjust(a)}>
                  <SlidersHorizontal size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
      <Cta onClick={() => setEdit("new")} tagline="Toque numa conta para editar. O ícone de ajuste acerta o saldo com o do banco.">
        Adicionar conta
      </Cta>

      <Modal open={edit !== null} onClose={() => setEdit(null)} title={edit === "new" ? "Nova conta" : "Editar conta"}>
        {edit !== null && <AccountEditor key={edit === "new" ? "new" : edit.id} account={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
      </Modal>
      <Modal open={adjust !== null} onClose={() => setAdjust(null)} title={adjust ? `Ajustar saldo · ${adjust.name}` : ""}>
        {adjust && <AdjustForm account={adjust} onClose={() => setAdjust(null)} />}
      </Modal>
    </FinanceShell>
  );
}

function AccountEditor({ account, onClose }: { account?: FinAccount; onClose: () => void }) {
  const { mutate } = useAppState();
  const toast = useToast();
  const [name, setName] = useState(account?.name ?? "");
  const [bank, setBank] = useState<string | null>(account?.bank ?? null);
  const [type, setType] = useState<AccountType>(account?.type ?? "checking");
  const [initial, setInitial] = useState(account ? centsToInput(Math.abs(account.initialBalance)) : "");
  const [negative, setNegative] = useState((account?.initialBalance ?? 0) < 0);
  const [include, setInclude] = useState(account?.includeInTotal !== false);
  const [confirm, setConfirm] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const nm = name.trim() || bankOf(bank)?.name || "Conta";
        const cents = (parseMoney(initial) ?? 0) * (negative ? -1 : 1);
        mutate((d) => saveAccount(d, { id: account?.id, name: nm, bank, type: bank === "carteira" ? "cash" : type, initialBalance: cents, includeInTotal: include, color: bankOf(bank)?.bg ?? "#173a5b" }));
        toast("Conta salva.");
        onClose();
      }}
    >
      <Field label="Banco" group>
        <BankPicker
          value={bank}
          onChange={(k) => {
            setBank(k);
            if (!name.trim() || BANKS.some((b) => b.name === name)) setName(bankOf(k)?.name ?? name);
          }}
        />
      </Field>
      <Field label="Nome (ex.: Nubank, Nubank DaylinTech)">
        <input
          className="input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!bank) setBank(guessBank(e.target.value));
          }}
        />
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
      <label className="row" style={{ borderBottom: 0, cursor: "pointer" }}>
        <span className="row-main" style={{ fontSize: 15 }}>
          Somar no saldo geral
          <small>Desligue para contas de outra pessoa ou da empresa.</small>
        </span>
        <Toggle checked={include} onChange={() => setInclude((v) => !v)} label="Somar no saldo geral" />
      </label>
      <button type="submit" className="btn primary block">
        Salvar conta
      </button>
      {account &&
        (!confirm ? (
          <button type="button" className="btn ghost block" style={{ marginTop: 8 }} onClick={() => setConfirm(true)}>
            <Archive size={18} /> Arquivar / remover conta
          </button>
        ) : (
          <div className="empty" style={{ marginTop: 10 }}>
            <p style={{ margin: "0 0 8px" }}>Se a conta tiver lançamentos, ela é arquivada e o histórico fica guardado.</p>
            <button
              type="button"
              className="btn danger sm"
              onClick={() => {
                mutate((d) => removeAccount(d, account.id));
                onClose();
              }}
            >
              Confirmar
            </button>
          </div>
        ))}
    </form>
  );
}

function AdjustForm({ account, onClose }: { account: FinAccount; onClose: () => void }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const current = accountBalance(s.finance, account);
  const [val, setVal] = useState(centsToInput(Math.abs(current)));
  const [neg, setNeg] = useState(current < 0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const target = (parseMoney(val) ?? 0) * (neg ? -1 : 1);
        let diff = 0;
        mutate((d) => {
          diff = adjustBalance(d, account.id, target);
        });
        toast(diff === 0 && target === current ? "O saldo já estava certo." : "Saldo ajustado.");
        onClose();
      }}
    >
      <p className="card-sub" style={{ marginTop: -6 }}>
        Saldo no NORTE: <b>{money(current)}</b>. Digite o saldo que aparece no app do banco. A diferença vira um “Ajuste de saldo”, que não entra como receita nem despesa.
      </p>
      <Field label="Saldo real no banco">
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} autoFocus />
          <button type="button" className="chip" aria-pressed={neg} onClick={() => setNeg((v) => !v)}>
            Negativo
          </button>
        </div>
      </Field>
      <button type="submit" className="btn primary block">
        Ajustar
      </button>
    </form>
  );
}
