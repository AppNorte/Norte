"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { Check, Field, Modal, Toggle, useToast } from "@/components/ui";
import { guessCategory } from "@/lib/finance/categorize";
import { parseStatement, type ImportRow } from "@/lib/finance/importer";
import { addTransaction, dayLabel, money } from "@/lib/finance/logic";
import { useAppState } from "@/store/StoreProvider";

interface Row extends ImportRow {
  key: string;
  selected: boolean;
  duplicate: boolean;
  categoryId: string | null;
}

const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Importar extrato">
      {open && <Inner onClose={onClose} />}
    </Modal>
  );
}

function Inner({ onClose }: { onClose: () => void }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const f = s.finance;
  const accounts = f.accounts.filter((a) => !a.archived);
  const cards = f.cards.filter((c) => !c.archived);
  const [target, setTarget] = useState(`acc:${accounts[0]?.id ?? ""}`);
  const isCard = target.startsWith("card:");
  const [positiveIsExpense, setPositiveIsExpense] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fileName, setFileName] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const read = async (fl: File | undefined, pie = positiveIsExpense) => {
    if (!fl) return;
    setFileName(fl.name);
    const buf = await fl.arrayBuffer();
    // Bancos brasileiros às vezes exportam em Latin-1
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("�")) text = new TextDecoder("iso-8859-1").decode(buf);
    const parsed = parseStatement(fl.name, text, pie);
    if (!parsed.length) {
      toast("Não encontrei lançamentos nesse arquivo. Use OFX ou CSV do seu banco.");
      setRows([]);
      return;
    }
    const existing = new Set(f.transactions.map((t) => `${t.date}|${t.amount}|${norm(t.description)}`));
    const ids = new Set(f.transactions.map((t) => /\[import:([^\]]+)\]/.exec(t.notes)?.[1]).filter(Boolean));
    setRows(
      parsed.map((r, i) => {
        const dup = (r.fitid && ids.has(r.fitid)) || existing.has(`${r.date}|${Math.abs(r.amount)}|${norm(r.description)}`);
        return {
          ...r,
          key: `${i}`,
          duplicate: Boolean(dup),
          selected: !dup,
          categoryId: guessCategory(r.description, r.amount < 0 ? "expense" : "income", f.categories),
        };
      }),
    );
  };

  const sel = rows?.filter((r) => r.selected && !(isCard && r.amount > 0)) ?? [];
  const outTotal = sel.filter((r) => r.amount < 0).reduce((a, r) => a - r.amount, 0);
  const inTotal = sel.filter((r) => r.amount > 0).reduce((a, r) => a + r.amount, 0);

  return (
    <div>
      <p className="card-sub" style={{ marginTop: -6 }}>
        No app do banco, exporte o extrato em <b>OFX</b> (o mais comum) ou <b>CSV</b>. Nada é enviado para fora do seu aparelho.
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
      <button type="button" className="btn primary block" onClick={() => file.current?.click()}>
        <FileUp size={18} /> {fileName ? "Escolher outro arquivo" : "Escolher arquivo do extrato"}
      </button>
      <input ref={file} type="file" accept=".ofx,.qfx,.csv,.txt,text/csv,application/x-ofx" hidden onChange={(e) => read(e.target.files?.[0])} aria-label="Arquivo do extrato" />

      {rows && rows.length > 0 && (
        <>
          <p className="card-sub" style={{ marginTop: 14 }}>
            {fileName}: {rows.length} lançamentos · {rows.filter((r) => r.duplicate).length} já existem no NORTE (desmarcados).
            {isCard && rows.some((r) => r.amount > 0) ? " Créditos e pagamentos da fatura são ignorados." : ""}
          </p>
          <ul className="list" style={{ maxHeight: "40dvh", overflowY: "auto", margin: "6px 0 12px" }}>
            {rows.map((r) => {
              const cat = f.categories.find((c) => c.id === r.categoryId);
              const ignored = isCard && r.amount > 0;
              return (
                <li key={r.key} className="row" style={{ opacity: ignored ? 0.4 : 1 }}>
                  <Check checked={r.selected && !ignored} label={r.description} onChange={() => !ignored && setRows((x) => x!.map((y) => (y.key === r.key ? { ...y, selected: !y.selected } : y)))} />
                  <span className="row-main" style={{ fontSize: 14.5, marginLeft: 6, minWidth: 0 }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</span>
                    <small>
                      {dayLabel(r.date)}
                      {cat ? ` · ${cat.name}` : ""}
                      {r.duplicate ? " · já existe" : ""}
                    </small>
                  </span>
                  <span className={`tx-amount ${r.amount < 0 ? "neg" : "pos"}`} style={{ fontSize: 14 }}>
                    {r.amount < 0 ? "−" : "+"} {money(Math.abs(r.amount))}
                  </span>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="btn primary block"
            disabled={!sel.length}
            onClick={() => {
              const [kind, id] = target.split(":");
              mutate((d) => {
                for (const r of sel) {
                  addTransaction(d, {
                    kind: r.amount < 0 ? "expense" : "income",
                    amount: Math.abs(r.amount),
                    date: r.date,
                    description: r.description.slice(0, 80),
                    categoryId: r.categoryId,
                    accountId: kind === "acc" ? id : null,
                    cardId: kind === "card" ? id : null,
                    paid: true,
                    notes: r.fitid ? `[import:${r.fitid}]` : "",
                  });
                }
              });
              toast(`${sel.length} lançamentos importados.`);
              onClose();
            }}
          >
            Importar {sel.length} ({inTotal ? `+${money(inTotal)} ` : ""}{outTotal ? `−${money(outTotal)}` : ""})
          </button>
        </>
      )}
    </div>
  );
}
