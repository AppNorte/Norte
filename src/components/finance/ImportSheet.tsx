"use client";

import { useRef, useState } from "react";
import { ChevronDown, FileUp, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Check, Field, Modal, Toggle, useToast } from "@/components/ui";
import { guessCategory } from "@/lib/finance/categorize";
import { parseStatement, type ImportRow } from "@/lib/finance/importer";
import { parsePdfStatement, pdfLines, PdfPasswordError, type PdfStatement, type StatementRow } from "@/lib/finance/pdfStatement";
import { recheckStatement } from "@/lib/finance/pdfSantander";
import { accountBalance, addTransaction, adjustBalance, centsToInput, dayLabel, money, parseMoney, saveAccount } from "@/lib/finance/logic";
import { uid } from "@/lib/id";
import { toDateKey } from "@/lib/dates";
import { useAppState } from "@/store/StoreProvider";

interface Row extends StatementRow {
  key: string;
  selected: boolean;
  duplicate: boolean;
  categoryId: string | null;
  newCat?: { kind: "expense" | "income"; name: string } | null; // categoria sugerida que ainda não existe (criada ao importar)
  toAccountId?: string | null; // transferência: outra conta ("new" = criar Poupança)
}

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export function ImportSheet({ open, onClose, accountId }: { open: boolean; onClose: () => void; accountId?: string | null }) {
  return (
    <Modal open={open} onClose={onClose} title="Importar extrato">
      {open && <Inner onClose={onClose} accountId={accountId ?? null} />}
    </Modal>
  );
}

function Inner({ onClose, accountId }: { onClose: () => void; accountId: string | null }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const f = s.finance;
  const accounts = f.accounts.filter((a) => !a.archived);
  const cards = f.cards.filter((c) => !c.archived);
  const [target, setTarget] = useState(`acc:${accountId ?? accounts[0]?.id ?? ""}`);
  const isCard = target.startsWith("card:");
  const [positiveIsExpense, setPositiveIsExpense] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  // PDF com senha (muitos bancos usam parte do CPF)
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [needPass, setNeedPass] = useState<null | "ask" | "wrong">(null);
  const [pass, setPass] = useState("");
  // Saldo final do extrato → ajustar o saldo da conta
  const [closingDate, setClosingDate] = useState("");
  const [closingInput, setClosingInput] = useState("");
  const [adjust, setAdjust] = useState(true);
  const [summary, setSummary] = useState<PdfStatement["summary"]>(null);
  const file = useRef<HTMLInputElement>(null);

  const savings = f.accounts.find((a) => !a.archived && a.type === "savings" && a.id !== target.split(":")[1]);
  const toRows = (parsed: (ImportRow | StatementRow)[]) => {
    const existing = new Set(f.transactions.map((t) => `${t.date}|${t.amount}|${norm(t.description)}`));
    const ids = new Set(f.transactions.map((t) => /\[import:([^\]]+)\]/.exec(t.notes)?.[1]).filter(Boolean));
    setRows(
      parsed.map((r, i) => {
        const sr = r as StatementRow;
        const dup = (r.fitid && ids.has(r.fitid)) || existing.has(`${r.date}|${Math.abs(r.amount)}|${norm(r.description)}`);
        const kind = r.amount < 0 ? "expense" : "income";
        // Categoria: a sugerida pelo tipo do extrato (se existir), senão o palpite pelo nome.
        const hinted = sr.catHint ? f.categories.find((c) => c.kind === sr.catHint!.kind && norm(c.name) === norm(sr.catHint!.name)) : undefined;
        const categoryId = sr.transfer ? null : (hinted?.id ?? guessCategory(r.description, kind, f.categories));
        // Sugestão do extrato sem categoria igual no app: vira categoria nova ao importar.
        const newCat = sr.catHint && !hinted ? sr.catHint : null;
        return {
          ...sr,
          key: `${i}`,
          duplicate: Boolean(dup),
          selected: !dup,
          categoryId: hinted ? hinted.id : newCat ? null : categoryId,
          newCat: hinted ? null : newCat,
          toAccountId: sr.transfer ? (savings?.id ?? "new") : null,
        };
      }),
    );
  };

  const readPdf = async (fl: File, password?: string) => {
    setBusy(true);
    try {
      const lines = await pdfLines(await fl.arrayBuffer(), password);
      setNeedPass(null);
      const st = parsePdfStatement(lines);
      if (!st.rows.length) {
        toast(
          lines.length < 3
            ? "Esse PDF parece ser uma imagem (escaneado). Exporte o extrato em PDF pelo app do banco, ou em OFX."
            : "Não reconheci lançamentos nesse PDF. Tente o extrato em OFX ou CSV.",
        );
        setRows([]);
        return;
      }
      toRows(st.rows);
      setSummary(st.summary ?? null);
      if (st.closing) {
        setClosingDate(st.closing.date);
        setClosingInput(centsToInput(st.closing.amount));
      }
    } catch (e) {
      if (e instanceof PdfPasswordError) {
        setPdfFile(fl);
        setNeedPass(e.wrong ? "wrong" : "ask");
      } else toast("Não consegui abrir esse PDF.");
    } finally {
      setBusy(false);
    }
  };

  const read = async (fl: File | undefined, pie = positiveIsExpense) => {
    if (!fl) return;
    setFileName(fl.name);
    setClosingDate("");
    setClosingInput("");
    setEditing(null);
    setSummary(null);
    if (fl.type === "application/pdf" || /\.pdf$/i.test(fl.name)) return readPdf(fl);
    const buf = await fl.arrayBuffer();
    // Bancos brasileiros às vezes exportam em Latin-1
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("�")) text = new TextDecoder("iso-8859-1").decode(buf);
    const parsed = parseStatement(fl.name, text, pie);
    if (!parsed.length) {
      toast("Não encontrei lançamentos nesse arquivo. Use PDF, OFX ou CSV do seu banco.");
      setRows([]);
      return;
    }
    toRows(parsed);
  };

  const patch = (key: string, p: Partial<Row>) => setRows((x) => x!.map((y) => (y.key === key ? { ...y, ...p } : y)));

  const sel = rows?.filter((r) => r.selected && !(isCard && r.amount > 0)) ?? [];
  // Conferências do extrato (refeitas a cada correção). Enquanto não baterem, o botão Importar fica bloqueado.
  const check = summary && rows ? recheckStatement(rows, summary) : null;
  const blocked = Boolean(check && !check.ok);
  const outTotal = sel.filter((r) => r.amount < 0).reduce((a, r) => a - r.amount, 0);
  const inTotal = sel.filter((r) => r.amount > 0).reduce((a, r) => a + r.amount, 0);
  const accId = !isCard ? target.split(":")[1] : null;
  const acc = accId ? f.accounts.find((a) => a.id === accId) : undefined;
  const closing = parseMoney(closingInput);
  const canAdjust = Boolean(acc && closingInput.trim() && closing != null && closingDate);

  const doImport = () => {
    const [kind, id] = target.split(":");
    let diff = 0;
    let createdSavings = false;
    mutate((d) => {
      // Categorias sugeridas que ainda não existem
      const made = new Map<string, string>();
      const catFor = (r: Row) => {
        if (r.categoryId || !r.newCat) return r.categoryId;
        const k = `${r.newCat.kind}:${norm(r.newCat.name)}`;
        if (!made.has(k)) {
          const ex = d.finance.categories.find((c) => c.kind === r.newCat!.kind && norm(c.name) === norm(r.newCat!.name));
          const nid = ex?.id ?? uid();
          if (!ex)
            d.finance.categories.push({
              id: nid,
              name: r.newCat.name,
              kind: r.newCat.kind,
              icon: "other",
              color: "#6a7a8c",
              budget: null,
            });
          made.set(k, nid);
        }
        return made.get(k)!;
      };
      let poupanca: string | null = null;
      const savingsId = () => {
        if (poupanca) return poupanca;
        saveAccount(d, {
          name: "Poupança",
          type: "savings",
          bank: f.accounts.find((a) => a.id === id)?.bank ?? null,
        });
        poupanca = d.finance.accounts[d.finance.accounts.length - 1].id;
        createdSavings = true;
        return poupanca;
      };
      for (const r of sel) {
        const isTransfer = kind === "acc" && r.transfer;
        if (isTransfer) {
          const other = r.toAccountId && r.toAccountId !== "new" ? r.toAccountId : savingsId();
          addTransaction(d, {
            kind: "transfer",
            amount: Math.abs(r.amount),
            date: r.date,
            description: r.description.slice(0, 80) || "Transferência",
            categoryId: null,
            accountId: r.amount < 0 ? id : other,
            toAccountId: r.amount < 0 ? other : id,
            cardId: null,
            paid: true,
            notes: "",
          });
          continue;
        }
        addTransaction(d, {
          kind: r.amount < 0 ? "expense" : "income",
          amount: Math.abs(r.amount),
          date: r.date,
          description: r.description.slice(0, 80) || "Lançamento",
          categoryId: catFor(r),
          accountId: kind === "acc" ? id : null,
          cardId: kind === "card" ? id : null,
          paid: true,
          notes: r.fitid ? `[import:${r.fitid}]` : "",
        });
      }
      if (adjust && canAdjust && kind === "acc") diff = adjustBalance(d, id, closing!, closingDate, true);
    });
    toast(
      `${sel.length} lançamentos importados${diff ? ` e saldo ajustado (${diff > 0 ? "+" : "−"}${money(Math.abs(diff))})` : ""}${createdSavings ? ". Criei a conta Poupança para as transferências" : ""}.`,
    );
    onClose();
  };

  // Prévia: quanto o saldo da conta ficará na data do extrato, só com o que foi marcado.
  const preview = acc && closingDate ? accountBalance(f, acc, closingDate) + sel.filter((r) => r.date <= closingDate).reduce((a, r) => a + r.amount, 0) : null;

  return (
    <div>
      <p className="card-sub" style={{ marginTop: -6 }}>
        Use o extrato em <b>PDF</b>, <b>OFX</b> ou <b>CSV</b> do app do banco. O arquivo é lido aqui no aparelho; nada é enviado.
      </p>
      <Field label="Para onde vão os lançamentos" group>
        <div className="chips">
          {accounts.map((a) => (
            <button key={a.id} type="button" className="chip" aria-pressed={target === `acc:${a.id}`} onClick={() => setTarget(`acc:${a.id}`)}>
              {a.name}
            </button>
          ))}
          {cards.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              aria-pressed={target === `card:${c.id}`}
              onClick={() => {
                setTarget(`card:${c.id}`);
                setPositiveIsExpense(true);
              }}
            >
              {c.name} (cartão)
            </button>
          ))}
        </div>
      </Field>
      {!/\.pdf$/i.test(fileName) && (
        <label className="row" style={{ borderBottom: 0, cursor: "pointer" }}>
          <span className="row-main" style={{ fontSize: 15 }}>
            Valores positivos são gastos
            <small>Ligue para CSV de fatura de cartão (ex.: Nubank cartão).</small>
          </span>
          <Toggle
            checked={positiveIsExpense}
            onChange={() => {
              const v = !positiveIsExpense;
              setPositiveIsExpense(v);
              if (file.current?.files?.[0]) void read(file.current.files[0], v);
            }}
            label="Valores positivos são gastos"
          />
        </label>
      )}
      <button type="button" className="btn primary block" onClick={() => file.current?.click()} disabled={busy}>
        <FileUp size={18} /> {busy ? "Lendo o extrato…" : fileName ? "Escolher outro arquivo" : "Escolher extrato (PDF, OFX ou CSV)"}
      </button>
      <input
        ref={file}
        type="file"
        accept=".pdf,.ofx,.qfx,.csv,.txt,application/pdf,text/csv,application/x-ofx"
        hidden
        onChange={(e) => read(e.target.files?.[0])}
        aria-label="Arquivo do extrato"
      />

      {needPass && pdfFile && (
        <form
          className="note"
          style={{ marginTop: 12, display: "grid", gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            void readPdf(pdfFile, pass);
          }}
        >
          <span>
            <Lock size={16} aria-hidden="true" /> {needPass === "wrong" ? "Senha incorreta. Tente de novo." : "Este PDF tem senha. Muitos bancos usam os primeiros dígitos do CPF."}
          </span>
          <input className="input" type="password" inputMode="numeric" autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} aria-label="Senha do PDF" />
          <button type="submit" className="btn sm primary" disabled={!pass}>
            Abrir PDF
          </button>
        </form>
      )}

      {rows && rows.length > 0 && (
        <>
          <p className="card-sub" style={{ marginTop: 14 }}>
            {fileName}: {rows.length} lançamentos · {rows.filter((r) => r.duplicate).length} já existem no NORTE (desmarcados). Toque no lápis para corrigir.
            {isCard && rows.some((r) => r.amount > 0) ? " Créditos e pagamentos da fatura são ignorados." : ""}
          </p>
          {check && (
            <div className={`import-check ${check.ok ? "ok" : "bad"}`} role={check.ok ? "status" : "alert"}>
              {check.ok ? (
                <b>✓ Conferido com o resumo do extrato: entradas, saídas e saldo de cada linha batem.</b>
              ) : (
                <>
                  <b>O extrato não conferiu. Corrija na lista antes de importar:</b>
                  <ul>
                    {check.messages.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          <ul className="list import-list">
            {rows.map((r, idx) => {
              const cat = f.categories.find((c) => c.id === r.categoryId);
              const wrong = check?.bad.has(idx);
              const ignored = isCard && r.amount > 0;
              const open = editing === r.key;
              return (
                <li key={r.key} className={`import-row ${open ? "open" : ""} ${wrong ? "wrong" : ""}`} style={{ opacity: ignored ? 0.4 : 1 }}>
                  <div className="row" style={{ borderBottom: 0 }}>
                    <Check checked={r.selected && !ignored} label={r.description} onChange={() => !ignored && patch(r.key, { selected: !r.selected })} />
                    <span className="row-main" style={{ fontSize: 14.5, marginLeft: 6, minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.description || "(sem descrição)"}
                      </span>
                      <small>
                        {dayLabel(r.date)}
                        {r.transfer && !isCard ? " · transferência" : cat ? ` · ${cat.name}` : r.newCat ? ` · ${r.newCat.name} (nova)` : ""}
                        {r.duplicate ? " · já existe" : ""}
                        {wrong && r.balance != null ? ` · saldo no extrato ${money(r.balance)}` : ""}
                      </small>
                    </span>
                    <span className={`tx-amount ${r.amount < 0 ? "neg" : "pos"}`} style={{ fontSize: 14 }}>
                      {r.amount < 0 ? "−" : "+"} {money(Math.abs(r.amount))}
                    </span>
                    <button type="button" className="icon-btn" aria-label={`Editar ${r.description}`} aria-expanded={open} onClick={() => setEditing(open ? null : r.key)}>
                      {open ? <ChevronDown size={18} /> : <Pencil size={16} />}
                    </button>
                  </div>
                  {open && (
                    <div className="import-edit">
                      <div className="grid-2">
                        <label className="field">
                          <span>Data</span>
                          <input className="input" type="date" value={r.date} onChange={(e) => e.target.value && patch(r.key, { date: e.target.value })} />
                        </label>
                        <label className="field">
                          <span>Valor</span>
                          <input
                            className="input"
                            inputMode="decimal"
                            defaultValue={centsToInput(Math.abs(r.amount))}
                            onChange={(e) => {
                              const v = parseMoney(e.target.value);
                              if (v != null)
                                patch(r.key, {
                                  amount: r.amount < 0 ? -Math.abs(v) : Math.abs(v),
                                });
                            }}
                            aria-label="Valor do lançamento"
                          />
                        </label>
                      </div>
                      <label className="field">
                        <span>Descrição</span>
                        <input className="input" value={r.description} onChange={(e) => patch(r.key, { description: e.target.value })} />
                      </label>
                      <div className="chips" role="group" aria-label="Tipo">
                        <button
                          type="button"
                          className="chip"
                          aria-pressed={r.amount < 0 && !r.transfer}
                          onClick={() =>
                            patch(r.key, {
                              amount: -Math.abs(r.amount),
                              categoryId: null,
                              transfer: false,
                            })
                          }
                        >
                          Saída
                        </button>
                        <button
                          type="button"
                          className="chip"
                          aria-pressed={r.amount > 0 && !r.transfer}
                          onClick={() =>
                            patch(r.key, {
                              amount: Math.abs(r.amount),
                              categoryId: null,
                              transfer: false,
                            })
                          }
                        >
                          Entrada
                        </button>
                        {!isCard && (
                          <button
                            type="button"
                            className="chip"
                            aria-pressed={Boolean(r.transfer)}
                            onClick={() =>
                              patch(r.key, {
                                transfer: true,
                                toAccountId: r.toAccountId ?? savings?.id ?? "new",
                              })
                            }
                          >
                            Transferência
                          </button>
                        )}
                      </div>
                      {r.transfer && !isCard && (
                        <label className="field">
                          <span>{r.amount < 0 ? "Para a conta" : "Vindo da conta"}</span>
                          <select className="select" value={r.toAccountId ?? "new"} onChange={(e) => patch(r.key, { toAccountId: e.target.value })}>
                            {f.accounts
                              .filter((a) => !a.archived && a.id !== target.split(":")[1])
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            <option value="new">Nova conta “Poupança”</option>
                          </select>
                        </label>
                      )}
                      {!r.transfer && (
                        <label className="field">
                          <span>Categoria</span>
                          <select
                            className="select"
                            value={r.categoryId ?? (r.newCat ? "new" : "")}
                            onChange={(e) =>
                              patch(
                                r.key,
                                e.target.value === "new"
                                  ? { categoryId: null }
                                  : {
                                      categoryId: e.target.value || null,
                                      newCat: e.target.value ? r.newCat : null,
                                    },
                              )
                            }
                          >
                            <option value="">Sem categoria</option>
                            {r.newCat && <option value="new">{r.newCat.name} (nova)</option>}
                            {f.categories
                              .filter((c) => c.kind === (r.amount < 0 ? "expense" : "income"))
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                      {wrong && r.balance != null && (
                        <p className="import-wrong-hint">Pelo extrato, o saldo depois desta movimentação é {money(r.balance)}. Confira o valor e o sinal.</p>
                      )}
                      <button
                        type="button"
                        className="btn sm ghost"
                        onClick={() => {
                          setRows((x) => x!.filter((y) => y.key !== r.key));
                          setEditing(null);
                        }}
                      >
                        <Trash2 size={16} /> Remover da lista
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="btn sm"
            style={{ marginBottom: 12 }}
            onClick={() => {
              const key = `n${Date.now()}`;
              setRows((x) => [
                ...(x ?? []),
                {
                  key,
                  date: closingDate || toDateKey(),
                  description: "",
                  amount: -0,
                  fitid: null,
                  selected: true,
                  duplicate: false,
                  categoryId: null,
                },
              ]);
              setEditing(key);
            }}
          >
            <Plus size={16} /> Adicionar movimentação que faltou
          </button>

          {acc && (
            <div className="import-balance">
              <b>Saldo final do extrato</b>
              <small>
                {closingDate ? "Encontrado no PDF — confira e corrija se precisar." : "Digite o saldo que aparece no fim do extrato para o NORTE ficar igual ao banco."}
              </small>
              <div className="grid-2">
                <label className="field">
                  <span>Data</span>
                  <input className="input" type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} />
                </label>
                <label className="field">
                  <span>Saldo (R$)</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={closingInput}
                    onChange={(e) => setClosingInput(e.target.value)}
                    placeholder="0,00"
                    aria-label="Saldo final do extrato"
                  />
                </label>
              </div>
              {canAdjust && (
                <label className="row" style={{ borderBottom: 0, cursor: "pointer", padding: 0 }}>
                  <span className="row-main" style={{ fontSize: 14.5 }}>
                    Ajustar o saldo de {acc.name}
                    <small>
                      {preview != null && closing != null && preview !== closing
                        ? `Depois de importar ficaria ${money(preview)}; o ajuste corrige ${preview < closing ? "+" : "−"}${money(Math.abs(closing - preview))}.`
                        : "O saldo já vai bater com o extrato."}
                    </small>
                  </span>
                  <Toggle checked={adjust} onChange={() => setAdjust((v) => !v)} label="Ajustar o saldo da conta" />
                </label>
              )}
            </div>
          )}

          {blocked && <p className="import-blocked">O botão fica liberado quando as conferências baterem.</p>}
          <button type="button" className="btn primary block" disabled={blocked || (!sel.length && !(adjust && canAdjust))} onClick={doImport}>
            Importar {sel.length} ({inTotal ? `+${money(inTotal)} ` : ""}
            {outTotal ? `−${money(outTotal)}` : ""}){adjust && canAdjust ? " e ajustar saldo" : ""}
          </button>
        </>
      )}
    </div>
  );
}
