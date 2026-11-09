"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, FileText, Info, Plus, Trash2, X } from "lucide-react";
import { gcalForTransaction } from "@/lib/calendar";
import { Field, Modal, Toggle, useToast } from "@/components/ui";
import { CatDot } from "./FinIcon";
import { addDays, toDateKey } from "@/lib/dates";
import { addMonths, addTransaction, centsToInput, deleteTransaction, FREQUENCY_LABEL, invoiceMonthFor, monthLabel, money, parseMoney, updateTransaction, type Frequency } from "@/lib/finance/logic";
import type { Transaction, TxIgnore, TxKind } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";
import { ReceiptCapture } from "./ReceiptCapture";
import { blobToBase64, deleteFile, getFile, putFile } from "@/lib/files";
import { decodeQrFromBlob } from "@/lib/qr";
import { parseNfceQr, type NfceDetails } from "@/lib/nfce";
import { guessCategory } from "@/lib/finance/categorize";
import { dateInMonth } from "@/lib/finance/logic";
import { addItemsToPantry } from "@/lib/pantry";
import { uid } from "@/lib/id";
import { callApi, serverAvailable } from "@/lib/api";

type Kind = Exclude<TxKind, "card_payment">;

export function TxForm({
  open,
  onClose,
  editId,
  initialKind = "expense",
  scan = false,
  cardId = null,
}: {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
  initialKind?: Kind;
  scan?: boolean;
  cardId?: string | null;
}) {
  const { s } = useAppState();
  const editing = editId ? s.finance.transactions.find((t) => t.id === editId) : undefined;
  // "Salvar e continuar": depois de salvar, abre um formulário novo mantendo tipo, conta/cartão, data e categoria.
  const [round, setRound] = useState(0);
  const [carry, setCarry] = useState<Carry | null>(null);
  const close = () => {
    setCarry(null);
    setRound(0);
    onClose();
  };
  return (
    <Modal open={open} onClose={close} title={editing ? "Editar lançamento" : "Novo lançamento"}>
      {open && (
        <Form
          key={`${editId ?? "new"}-${scan}-${cardId}-${round}`}
          onClose={close}
          onContinue={(c) => {
            setCarry(c);
            setRound((r) => r + 1);
          }}
          editing={editing}
          initialKind={carry?.kind ?? initialKind}
          scan={round === 0 && scan}
          cardId={cardId}
          carry={carry}
        />
      )}
    </Modal>
  );
}

interface Carry {
  kind: Kind;
  source: string;
  date: string;
  categoryId: string | null;
}

type RepMode = "none" | "installments" | "fixed";

const IGNORE_OPTIONS: [keyof TxIgnore, string, string][] = [
  ["limit", "Ignorar no limite do cartão", "Não ocupa o limite disponível"],
  ["stats", "Ignorar em estatísticas e gráficos", "Fica fora dos relatórios e do “para onde foi”"],
  ["budget", "Ignorar em orçamentos", "Não consome o limite da categoria"],
  ["savings", "Ignorar em economia mensal", "Não entra no cálculo do quanto sobrou"],
  ["totals", "Ignorar nos totais", "Fora dos totais de receitas e despesas (o saldo da conta continua certo)"],
];

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function parseTags(text: string): string[] {
  return [...text.matchAll(/#([\p{L}\d_-]+)/gu)].map((m) => m[1].toLowerCase());
}

function Form({
  onClose,
  onContinue,
  editing,
  initialKind,
  scan,
  cardId,
  carry,
}: {
  onClose: () => void;
  onContinue: (c: Carry) => void;
  editing?: Transaction;
  initialKind: Kind;
  scan: boolean;
  cardId: string | null;
  carry: Carry | null;
}) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const f = s.finance;
  const accounts = f.accounts.filter((a) => !a.archived);
  const cards = f.cards.filter((c) => !c.archived);
  const today = toDateKey();

  const [kind, setKind] = useState<Kind>((editing?.kind as Kind) ?? initialKind);
  const baseAmount = editing ? editing.amount + (editing.extra ? (editing.extra.kind === "fee" ? -editing.extra.amount : editing.extra.amount) : 0) : 0;
  const [amount, setAmount] = useState(editing ? centsToInput(baseAmount) : "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? carry?.categoryId ?? null);
  // "acc:<id>" ou "card:<id>"
  const [source, setSource] = useState<string>(
    editing?.cardId ? `card:${editing.cardId}` : cardId ? `card:${cardId}` : (carry?.source ?? `acc:${editing?.accountId ?? accounts[0]?.id ?? ""}`),
  );
  const [toAccount, setToAccount] = useState<string>(editing?.toAccountId ?? accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [date, setDate] = useState(editing?.date ?? carry?.date ?? today);
  const [paid, setPaid] = useState(editing?.paid ?? true);
  // Repetição
  const [repMode, setRepMode] = useState<RepMode>("none");
  const [instStart, setInstStart] = useState(1);
  const [instTotal, setInstTotal] = useState(2);
  const [freq, setFreq] = useState<Frequency>("monthly");
  const [perInstallment, setPerInstallment] = useState(false);
  const installments = repMode === "installments" ? instTotal : 1;
  // Fatura escolhida (cartão)
  const [invoiceOverride, setInvoiceOverride] = useState<string | null>(editing?.cardId ? (editing.invoiceMonth ?? null) : null);
  // Detalhes
  const [time, setTime] = useState(editing ? (editing.time ?? "") : nowTime());
  const [subcategory, setSubcategory] = useState(editing?.subcategory ?? "");
  const [multi, setMulti] = useState(Boolean(editing?.splits?.length));
  const [splits, setSplits] = useState<{ categoryId: string | null; amount: string }[]>(
    editing?.splits?.length ? editing.splits.map((x) => ({ categoryId: x.categoryId, amount: centsToInput(x.amount) })) : [{ categoryId: null, amount: "" }, { categoryId: null, amount: "" }],
  );
  const [tags, setTags] = useState<string[]>(editing?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [extraKind, setExtraKind] = useState<"fee" | "discount">(editing?.extra?.kind ?? "fee");
  const [extraAmount, setExtraAmount] = useState(editing?.extra ? centsToInput(editing.extra.amount) : "");
  const [ignore, setIgnore] = useState<TxIgnore>(editing?.ignore ?? {});
  const [keepGoing, setKeepGoing] = useState(Boolean(carry));
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Nota fiscal
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [keepAttachment, setKeepAttachment] = useState(Boolean(editing?.attachmentId));
  const [nfce, setNfce] = useState<{ chave: string; url: string } | null>(editing?.nfce ?? null);
  const [items, setItems] = useState<NfceDetails["items"]>([]);
  const [toPantry, setToPantry] = useState(true);
  const [rBusy, setRBusy] = useState(false);
  const [rStatus, setRStatus] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);

  useEffect(() => {
    callApi("receipt")
      .then((r) => r.json())
      .then((j: { ai?: boolean }) => setAiAvailable(Boolean(j.ai)))
      .catch(() => setAiAvailable(false));
  }, []);

  // Foto já salva (edição)
  useEffect(() => {
    if (!editing?.attachmentId) return;
    let url: string | null = null;
    getFile(editing.attachmentId)
      .then((b) => {
        if (!b) return;
        if (b.type === "application/pdf") {
          setPdfName("Arquivo PDF anexado");
          return;
        }
        url = URL.createObjectURL(b);
        setPhotoUrl(url);
      })
      .catch(() => {});
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [editing?.attachmentId]);

  const applyDetails = (d: NfceDetails, fromAi = false) => {
    if (d.total) setAmount(centsToInput(d.total));
    if (d.date) setDate(d.date);
    if (d.store) {
      const store = d.store.length > 40 ? d.store.slice(0, 40) : d.store;
      setDescription((x) => x || store.charAt(0) + store.slice(1).toLowerCase());
      const cat = guessCategory(`${d.store} ${d.items.map((i) => i.name).join(" ")}`, "expense", f.categories) ?? (d.items.length >= 3 ? (f.categories.find((c) => c.kind === "expense" && c.name === "Mercado")?.id ?? null) : null);
      if (cat) setCategoryId((x) => x ?? cat);
    }
    setItems(d.items ?? []);
    setRStatus(`${fromAi ? "Lido pela IA" : "Nota encontrada"}${d.store ? `: ${d.store}` : ""}${d.total ? ` · ${money(d.total)}` : ""}. Confira os campos.`);
  };

  const handleQr = async (text: string) => {
    const q = parseNfceQr(text);
    if (!q) {
      setRStatus("Esse QR Code não é de uma nota fiscal.");
      return;
    }
    setKind("expense");
    setNfce({ chave: q.chave, url: q.url });
    if (q.total) setAmount(centsToInput(q.total));
    if (q.month && q.day) setDate(dateInMonth(q.month, q.day));
    setRBusy(true);
    setRStatus("Nota encontrada. Buscando valor e itens na Sefaz…");
    try {
      const r = await callApi("nfce", { url: q.url }, 20_000);
      const j = (await r.json()) as NfceDetails & { error?: string };
      if (!r.ok) throw new Error(j.error);
      applyDetails(j);
    } catch (e) {
      const why = !serverAvailable() ? "A busca automática na Sefaz liga junto com a nuvem (Supabase)." : e instanceof Error && e.message ? e.message : "Não consegui abrir a nota na Sefaz.";
      setRStatus(`${why} A nota ficou guardada; ${q.total ? "o valor já foi preenchido." : "digite o valor."}`);
    } finally {
      setRBusy(false);
    }
  };

  const readWithAi = async (blob = photo) => {
    if (!blob) return;
    setRBusy(true);
    setRStatus("Lendo a nota com IA…");
    try {
      const r = await callApi("receipt", { image: await blobToBase64(blob) }, 50_000);
      const j = (await r.json()) as NfceDetails & { error?: string };
      if (!r.ok) throw new Error(j.error);
      applyDetails(j, true);
    } catch (e) {
      setRStatus(e instanceof Error && e.message ? e.message : "Não consegui ler a foto.");
    } finally {
      setRBusy(false);
    }
  };

  const handlePhoto = async (blob: Blob) => {
    setPhoto(blob);
    setPdfName(null);
    setKeepAttachment(false);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(blob));
    setRBusy(true);
    setRStatus("Procurando o QR Code na foto…");
    const qr = await decodeQrFromBlob(blob).catch(() => null);
    setRBusy(false);
    if (qr && parseNfceQr(qr)) return handleQr(qr);
    if (aiAvailable) return readWithAi(blob);
    setRStatus("Foto anexada. Não achei um QR Code legível; preencha o valor.");
  };

  const cats = f.categories.filter((c) => c.kind === (kind === "income" ? "income" : "expense"));
  const isCard = kind === "expense" && source.startsWith("card:");
  const base = parseMoney(amount);
  const extra = kind === "transfer" ? 0 : (parseMoney(extraAmount) ?? 0);
  const cents = base ? Math.max(0, base + (extraKind === "fee" ? extra : -extra)) : base;
  const sourceId = source.split(":")[1] || null;
  const card = isCard ? cards.find((c) => c.id === sourceId) : undefined;
  const autoInvoice = card ? invoiceMonthFor(card, date) : null;
  const invoiceMonth = card ? (invoiceOverride ?? autoInvoice) : null;
  const splitCents = splits.map((x) => parseMoney(x.amount) ?? 0);
  const splitSum = splitCents.reduce((a, v) => a + v, 0);
  const useSplits = multi && kind !== "transfer";
  // Subcategorias já usadas nesta categoria (sugestões)
  const subSuggestions = [...new Set(f.transactions.filter((t) => t.categoryId === categoryId && t.subcategory).map((t) => t.subcategory as string))].slice(0, 12);
  const allTags = [...new Set(f.transactions.flatMap((t) => t.tags ?? []))].filter((t) => !tags.includes(t)).slice(0, 10);
  const perPart = cents && repMode === "installments" ? (perInstallment ? cents : Math.floor(cents / instTotal)) : 0;
  const addTag = (raw: string) => {
    const t = raw.replace(/^#/, "").trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags((x) => [...x, t]);
    setTagInput("");
  };

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
    if (useSplits && splitSum !== cents) {
      toast(`A soma das categorias (${money(splitSum)}) precisa ser igual ao valor (${money(cents)}).`);
      return;
    }
    let attachmentId: string | null = keepAttachment ? (editing?.attachmentId ?? null) : null;
    if (photo) {
      attachmentId = uid();
      void putFile(attachmentId, photo).catch(() => toast("Não consegui guardar a foto neste aparelho."));
    }
    if (editing?.attachmentId && editing.attachmentId !== attachmentId) void deleteFile(editing.attachmentId).catch(() => {});
    const finalSplits = useSplits ? splits.map((x, i) => ({ categoryId: x.categoryId, amount: splitCents[i] })).filter((x) => x.amount > 0) : null;
    const catId = kind === "transfer" ? null : useSplits ? (finalSplits?.[0]?.categoryId ?? null) : categoryId;
    const finalTags = [...new Set([...tags, ...parseTags(notes), ...(tagInput.trim() ? [tagInput.replace(/^#/, "").trim().toLowerCase()] : [])])];
    const finalExtra = extra > 0 && kind !== "transfer" ? { kind: extraKind, amount: extra } : null;
    const finalIgnore = Object.values(ignore).some(Boolean) ? ignore : undefined;
    const details = {
      time: time || null,
      subcategory: useSplits || kind === "transfer" ? null : subcategory.trim() || null,
      splits: finalSplits,
      tags: finalTags,
      extra: finalExtra,
      ignore: finalIgnore,
    };
    const desc = description.trim() || (kind === "transfer" ? "Transferência" : (cats.find((c) => c.id === catId)?.name ?? (kind === "income" ? "Receita" : "Despesa")));
    if (editing) {
      mutate((d) =>
        updateTransaction(d, editing.id, {
          amount: cents,
          description: desc,
          categoryId: catId,
          date,
          ...details,
          invoiceMonth: isCard ? invoiceMonth : null,
          paid: isCard ? true : paid,
          notes,
          accountId: isCard ? null : sourceId,
          cardId: isCard ? sourceId : null,
          toAccountId: kind === "transfer" ? toAccount : null,
          attachmentId,
          nfce,
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
          categoryId: catId,
          accountId: isCard ? null : sourceId,
          toAccountId: toAccount,
          cardId: isCard ? sourceId : null,
          paid: isCard ? true : paid,
          installments: kind !== "transfer" ? installments : 1,
          startInstallment: instStart,
          frequency: freq,
          perInstallment,
          invoiceMonth,
          repeatMonthly: repMode === "fixed" && kind !== "transfer",
          ...details,
          notes,
          attachmentId,
          nfce,
        }),
      );
      if (items.length && toPantry) mutate((d) => addItemsToPantry(d, items, date));
      const created = installments > 1 ? installments - Math.min(instStart, installments) + 1 : 1;
      toast(installments > 1 ? `Lançado: ${created} ${created === 1 ? "parcela" : "parcelas"} de ${money(perPart)}.` : "Lançamento salvo.");
      if (keepGoing) {
        onContinue({ kind, source, date, categoryId: useSplits ? null : categoryId });
        return;
      }
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

      {kind === "expense" && (
        <>
          <ReceiptCapture
            photoUrl={photoUrl}
            busy={rBusy}
            status={rStatus}
            aiAvailable={aiAvailable}
            nfceUrl={nfce?.url ?? null}
            onPhoto={handlePhoto}
            onQr={handleQr}
            onAi={() => void readWithAi()}
            autoScan={scan}
            onRemove={() => {
              setPhoto(null);
              setKeepAttachment(false);
              if (photoUrl) URL.revokeObjectURL(photoUrl);
              setPhotoUrl(null);
              setRStatus(null);
            }}
          />
          {items.length > 0 && !editing && (
            <label className="row" style={{ borderBottom: 0, cursor: "pointer" }}>
              <span className="row-main" style={{ fontSize: 15 }}>
                Guardar {items.length} itens na despensa
                <small>{items.slice(0, 4).map((i) => i.name.toLowerCase()).join(", ")}{items.length > 4 ? "…" : ""}</small>
              </span>
              <Toggle checked={toPantry} onChange={() => setToPantry((v) => !v)} label="Guardar itens na despensa" />
            </label>
          )}
        </>
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
        <>
          <label className="row" style={{ borderBottom: 0, cursor: "pointer", paddingTop: 0 }}>
            <span className="row-main" style={{ fontSize: 15.5 }}>
              Multicategorias
              <small>Dividir o valor entre várias categorias (ex.: mercado + farmácia)</small>
            </span>
            <Toggle checked={multi} onChange={() => setMulti((v) => !v)} label="Multicategorias" />
          </label>
          {multi ? (
            <div className="split-box" role="group" aria-label="Divisão por categoria">
              {splits.map((x, i) => (
                <div key={i} className="split-row">
                  <select
                    className="select"
                    aria-label={`Categoria ${i + 1}`}
                    value={x.categoryId ?? ""}
                    onChange={(e) => setSplits((l) => l.map((y, j) => (j === i ? { ...y, categoryId: e.target.value || null } : y)))}
                  >
                    <option value="">Sem categoria</option>
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="0,00"
                    aria-label={`Valor da categoria ${i + 1}`}
                    value={x.amount}
                    onChange={(e) => setSplits((l) => l.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)))}
                  />
                  <button type="button" className="icon-btn" aria-label={`Remover categoria ${i + 1}`} disabled={splits.length <= 2} onClick={() => setSplits((l) => l.filter((_, j) => j !== i))}>
                    <X size={18} />
                  </button>
                </div>
              ))}
              <div className="split-foot">
                <button type="button" className="btn sm" onClick={() => setSplits((l) => [...l, { categoryId: null, amount: cents && splitSum < cents ? centsToInput(cents - splitSum) : "" }])}>
                  <Plus size={16} /> Categoria
                </button>
                <small className={cents && splitSum !== cents ? "neg" : "pos"}>
                  {!cents ? "Informe o valor total" : splitSum === cents ? "Valores conferem" : splitSum < cents ? `Faltam ${money(cents - splitSum)}` : `Passou ${money(splitSum - cents)}`}
                </small>
              </div>
            </div>
          ) : (
            <>
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
              {categoryId && (
                <Field label="Subcategoria (opcional)">
                  <input className="input" list="subcat-list" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="Ex.: Anuidade, Farmácia, Gasolina" />
                  <datalist id="subcat-list">
                    {subSuggestions.map((x) => (
                      <option key={x} value={x} />
                    ))}
                  </datalist>
                </Field>
              )}
            </>
          )}
        </>
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
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  aria-pressed={source === `card:${c.id}`}
                  onClick={() => {
                    setSource(`card:${c.id}`);
                    setInvoiceOverride(null);
                  }}
                >
                  <span className="dot" style={{ background: c.color }} />
                  {c.name} (cartão)
                </button>
              ))}
          </div>
        </Field>
      )}

      {card && invoiceMonth && (
        <>
          <div className="invoice-pick" role="group" aria-label="Fatura">
            <span>Fatura</span>
            <button type="button" className="icon-btn" aria-label="Fatura anterior" onClick={() => setInvoiceOverride(addMonths(invoiceMonth, -1))}>
              <ChevronLeft size={20} />
            </button>
            <b>{monthLabel(invoiceMonth)}</b>
            <button type="button" className="icon-btn" aria-label="Próxima fatura" onClick={() => setInvoiceOverride(addMonths(invoiceMonth, 1))}>
              <ChevronRight size={20} />
            </button>
          </div>
          {!card.payAccountId && (
            <p className="note">
              <Info size={18} aria-hidden="true" /> Este cartão não tem conta vinculada. A conta será escolhida no pagamento da fatura.
            </p>
          )}
        </>
      )}

      <Field label="Data" group>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="input"
            type="date"
            aria-label="Data"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setInvoiceOverride(null);
            }}
            required
            style={{ flex: "1 1 150px" }}
          />
          <input className="input" type="time" aria-label="Hora" value={time} onChange={(e) => setTime(e.target.value)} style={{ flex: "0 0 112px" }} />
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

      {!editing && kind !== "transfer" && (
        <Field label="Repetição" group>
          <div className="seg seg-3" role="radiogroup" aria-label="Repetição">
            {(
              [
                ["none", "Não recorrente"],
                ["installments", "Parcelar ou repetir"],
                ["fixed", "Fixa mensal"],
              ] as [RepMode, string][]
            ).map(([k, label]) => (
              <button key={k} type="button" role="radio" aria-checked={repMode === k} className="seg-btn" onClick={() => setRepMode(k)}>
                {label}
              </button>
            ))}
          </div>
          {repMode === "installments" && (
            <div className="rep-box">
              <div className="grid-2">
                <label className="field">
                  <span>Começar na parcela</span>
                  <input className="input" type="number" inputMode="numeric" min={1} max={instTotal} value={instStart} onChange={(e) => setInstStart(Math.max(1, Math.min(instTotal, Number(e.target.value) || 1)))} />
                </label>
                <label className="field">
                  <span>Total de parcelas</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={2}
                    max={48}
                    value={instTotal}
                    onChange={(e) => {
                      const n = Math.max(2, Math.min(48, Number(e.target.value) || 2));
                      setInstTotal(n);
                      setInstStart((x) => Math.min(x, n));
                    }}
                  />
                </label>
              </div>
              <Field label="Frequência">
                <select className="select" value={freq} onChange={(e) => setFreq(e.target.value as Frequency)}>
                  {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((k) => (
                    <option key={k} value={k}>
                      {FREQUENCY_LABEL[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="chips" role="radiogroup" aria-label="O valor informado é">
                <button type="button" role="radio" className="chip" aria-checked={!perInstallment} aria-pressed={!perInstallment} onClick={() => setPerInstallment(false)}>
                  Valor total
                </button>
                <button type="button" role="radio" className="chip" aria-checked={perInstallment} aria-pressed={perInstallment} onClick={() => setPerInstallment(true)}>
                  Valor da parcela
                </button>
              </div>
              <p className="rep-sum">
                {instTotal} parcelas{cents ? ` · ${money(perPart)}` : ""} · {FREQUENCY_LABEL[freq]}
                {instStart > 1 ? ` · lança da ${instStart}ª à ${instTotal}ª` : ""}
              </p>
            </div>
          )}
          {repMode === "fixed" && <p className="rep-sum">Repete todo dia {Number(date.slice(8, 10))}, até você encerrar. Para contas fixas: aluguel, internet, salário…</p>}
        </Field>
      )}

      <Field label="Observações e #etiquetas">
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: presente da Bia #aniversario" />
      </Field>

      <details className="more" open={Boolean(editing && (editing.tags?.length || editing.extra || editing.ignore)) || undefined}>
        <summary>Mais opções</summary>

        {kind !== "transfer" && (
          <Field label="Encargos (juros, multa, taxa) ou desconto" group>
            <div className="chips" role="radiogroup" aria-label="Tipo de ajuste">
              <button type="button" role="radio" className="chip" aria-checked={extraKind === "fee"} aria-pressed={extraKind === "fee"} onClick={() => setExtraKind("fee")}>
                Encargos
              </button>
              <button type="button" role="radio" className="chip" aria-checked={extraKind === "discount"} aria-pressed={extraKind === "discount"} onClick={() => setExtraKind("discount")}>
                Desconto
              </button>
            </div>
            <input className="input" inputMode="decimal" placeholder="R$ 0,00" aria-label="Valor de encargos ou desconto" value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} style={{ marginTop: 8 }} />
            {extra > 0 && base ? (
              <small className="field-hint">
                {money(base)} {extraKind === "fee" ? "+" : "−"} {money(extra)} = <b>{money(cents ?? 0)}</b>
              </small>
            ) : null}
          </Field>
        )}

        <Field label="Etiquetas" group>
          <div className="chips">
            {tags.map((t) => (
              <button key={t} type="button" className="chip" aria-pressed="true" onClick={() => setTags((x) => x.filter((y) => y !== t))} aria-label={`Remover etiqueta ${t}`}>
                #{t} <X size={14} />
              </button>
            ))}
          </div>
          <input
            className="input"
            value={tagInput}
            onChange={(e) => (e.target.value.endsWith(",") || e.target.value.endsWith(" ") ? addTag(e.target.value.slice(0, -1)) : setTagInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder="Digite e toque Enter: viagem, casa, trabalho…"
            aria-label="Nova etiqueta"
            style={{ marginTop: 8 }}
          />
          {allTags.length > 0 && (
            <div className="chips" style={{ marginTop: 8 }}>
              {allTags.map((t) => (
                <button key={t} type="button" className="chip" onClick={() => addTag(t)}>
                  + #{t}
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Anexo em PDF (boleto, comprovante)" group>
          {pdfName ? (
            <div className="chips">
              <span className="chip" aria-pressed="true">
                <FileText size={16} /> {pdfName}
              </span>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => {
                  setPdfName(null);
                  setPhoto(null);
                  setKeepAttachment(false);
                }}
              >
                Remover
              </button>
            </div>
          ) : (
            <label className="btn sm" style={{ width: "fit-content" }}>
              <FileText size={16} /> Escolher PDF
              <input
                type="file"
                accept="application/pdf"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 8 * 1024 * 1024) {
                    toast("PDF muito grande (máximo 8 MB).");
                    return;
                  }
                  setPhoto(file);
                  setKeepAttachment(false);
                  if (photoUrl) URL.revokeObjectURL(photoUrl);
                  setPhotoUrl(null);
                  setPdfName(file.name);
                }}
              />
            </label>
          )}
        </Field>

        {kind !== "transfer" && (
          <div role="group" aria-label="Onde este lançamento não conta">
            {IGNORE_OPTIONS.filter(([k]) => k !== "limit" || isCard).map(([k, label, hint]) => (
              <label key={k} className="row" style={{ cursor: "pointer" }}>
                <span className="row-main" style={{ fontSize: 15 }}>
                  {label}
                  <small>{hint}</small>
                </span>
                <Toggle checked={Boolean(ignore[k])} onChange={() => setIgnore((x) => ({ ...x, [k]: !x[k] }))} label={label} />
              </label>
            ))}
          </div>
        )}

        {!editing && (
          <label className="row" style={{ cursor: "pointer", borderBottom: 0 }}>
            <span className="row-main" style={{ fontSize: 15 }}>
              Salvar e continuar
              <small>Depois de salvar, abre outro lançamento com a mesma conta e data</small>
            </span>
            <Toggle checked={keepGoing} onChange={() => setKeepGoing((v) => !v)} label="Salvar e continuar" />
          </label>
        )}
      </details>

      <button type="submit" className="btn primary block">
        {editing ? "Salvar alterações" : "Salvar lançamento"}
      </button>

      {editing && (editing.kind === "expense" || editing.kind === "income") && !editing.cardId && (
        <a
          className="btn block"
          style={{ marginTop: 10 }}
          href={gcalForTransaction(editing, editing.recurringId ? f.recurring.find((r) => r.id === editing.recurringId) : null)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <CalendarPlus size={18} /> {editing.recurringId ? "Lembrar todo mês no Google Agenda" : "Lembrar no Google Agenda"}
        </a>
      )}

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
                    if (editing.attachmentId && !s.finance.transactions.some((t) => t.id !== editing.id && t.attachmentId === editing.attachmentId)) void deleteFile(editing.attachmentId).catch(() => {});
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
