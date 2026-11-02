"use client";

import { useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Card, CardHead, Check, Cta, Field, Modal, Toggle, useToast } from "@/components/ui";
import { SCREEN_VERSES } from "@/lib/content";
import { addDays, dayMonth, toDateKey } from "@/lib/dates";
import { useNow } from "@/lib/useNow";
import { centsToInput, money, parseMoney } from "@/lib/finance/logic";
import {
  LOCATIONS,
  PANTRY_CATEGORIES,
  UNITS,
  addMissingToList,
  addShopItem,
  changeQty,
  finishShopping,
  fmtQty,
  guessCategory,
  itemStatus,
  lastPrice,
  missingItems,
  norm,
  pantrySummary,
  priceHistory,
  removePantryItem,
  savePantryItem,
  shoppingTotal,
} from "@/lib/pantry";
import type { PantryItem, PantryLocation } from "@/lib/types";
import { useAppState } from "@/store/StoreProvider";

type Tab = "despensa" | "lista" | "validade";

const STATUS_LABEL = { out: "Acabou", low: "Acabando", expiring: "Vence", expired: "Vencido", ok: "" } as const;

export default function Casa() {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const now = useNow();
  const today = toDateKey(now);
  const [tab, setTab] = useState<Tab>(() => (s.pantry.shopping.some((x) => !x.checked) ? "lista" : "despensa"));
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState<PantryLocation | "all">("all");
  const [edit, setEdit] = useState<PantryItem | "new" | null>(null);
  const [quick, setQuick] = useState("");
  const [finish, setFinish] = useState(false);

  const sum = pantrySummary(s, today);
  const missing = missingItems(s, today);
  const items = s.pantry.items
    .filter((it) => (loc === "all" || it.location === loc) && (!q.trim() || norm(it.name).includes(norm(q))))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const cats = PANTRY_CATEGORIES.filter((c) => items.some((it) => it.category === c));
  const shopping = s.pantry.shopping;
  const shopCats = [...new Set(shopping.map((x) => x.category))].sort((a, b) => PANTRY_CATEGORIES.indexOf(a) - PANTRY_CATEGORIES.indexOf(b));
  const checkedCount = shopping.filter((x) => x.checked).length;
  const expiring = s.pantry.items.filter((it) => it.expiry).sort((a, b) => (a.expiry ?? "").localeCompare(b.expiry ?? ""));

  const addQuick = (e: React.FormEvent) => {
    e.preventDefault();
    const names = quick.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
    if (!names.length) return;
    mutate((d) => names.forEach((n) => addShopItem(d, { name: n })));
    setQuick("");
  };

  return (
    <>
      <Hero title="Casa" sub="Despensa e lista de compras." quote={SCREEN_VERSES.casa} />
      <div className="sheet">
        <div className="seg" role="tablist" aria-label="Seções da casa">
          <button type="button" role="tab" className="seg-btn" aria-selected={tab === "despensa"} onClick={() => setTab("despensa")}>
            Despensa
          </button>
          <button type="button" role="tab" className="seg-btn" aria-selected={tab === "lista"} onClick={() => setTab("lista")}>
            Lista{sum.toBuy ? ` (${sum.toBuy})` : ""}
          </button>
          <button type="button" role="tab" className="seg-btn" aria-selected={tab === "validade"} onClick={() => setTab("validade")}>
            Validade
          </button>
        </div>

        <div className="stat-row">
          <div className="stat">
            <b>{sum.total}</b>
            <small>itens em casa</small>
          </div>
          <div className={`stat ${sum.low ? "warn" : ""}`}>
            <b>{sum.low}</b>
            <small>acabando</small>
          </div>
          <div className={`stat ${sum.expiring ? "alert" : ""}`}>
            <b>{sum.expiring}</b>
            <small>vencendo</small>
          </div>
        </div>

        {tab === "despensa" && (
          <>
            <label className="search" style={{ marginBottom: 10 }}>
              <Search size={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar na despensa" aria-label="Buscar na despensa" />
            </label>
            <div className="chips" style={{ marginBottom: 12, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 2 }}>
              <button type="button" className="chip" aria-pressed={loc === "all"} onClick={() => setLoc("all")}>
                Tudo
              </button>
              {LOCATIONS.map((l) => (
                <button key={l.key} type="button" className="chip" style={{ flex: "none" }} aria-pressed={loc === l.key} onClick={() => setLoc(l.key)}>
                  {l.label}
                </button>
              ))}
            </div>
            {missing.length > 0 && (
              <button
                type="button"
                className="banner"
                onClick={() => {
                  mutate((d) => void addMissingToList(d, today));
                  toast(`${missing.length} item(ns) adicionados à lista de compras.`);
                  setTab("lista");
                }}
              >
                <ShoppingCart size={20} /> {missing.length} item(ns) acabando. Adicionar à lista
              </button>
            )}
            {s.pantry.items.length === 0 ? (
              <Card>
                <CardHead title="Sua despensa está vazia" sub="Cadastre o que tem em casa, ou faça uma lista de compras: ao concluir, os itens entram aqui sozinhos." />
                <button type="button" className="btn primary block" onClick={() => setEdit("new")}>
                  <Plus size={18} /> Adicionar item
                </button>
              </Card>
            ) : items.length === 0 ? (
              <p className="empty">Nada encontrado.</p>
            ) : (
              cats.map((c) => (
                <Card key={c}>
                  <h2 className="card-title" style={{ fontSize: 18, marginBottom: 4 }}>
                    {c}
                  </h2>
                  <ul className="list">
                    {items
                      .filter((it) => it.category === c)
                      .map((it) => {
                        const st = itemStatus(it, today);
                        return (
                          <li key={it.id} className="pantry-row">
                            <button type="button" className="pantry-main" onClick={() => setEdit(it)}>
                              <span className="pantry-name">{it.name}</span>
                              <small>
                                {LOCATIONS.find((l) => l.key === it.location)?.label}
                                {it.expiry ? ` · vence ${dayMonth(it.expiry)}` : ""}
                                {st.status !== "ok" && (
                                  <b className={`tag ${st.status === "low" ? "" : "tag-out"}`}>
                                    {STATUS_LABEL[st.status]}
                                    {st.status === "expiring" ? (st.days === 0 ? " hoje" : ` em ${st.days}d`) : ""}
                                  </b>
                                )}
                              </small>
                            </button>
                            <span className="stepper-qty">
                              <button type="button" className="qty-btn" aria-label={`Menos ${it.name}`} onClick={() => mutate((d) => changeQty(d, it.id, -1))}>
                                <Minus size={16} />
                              </button>
                              <span className="qty">
                                {fmtQty(it.qty)}
                                <small>{it.unit}</small>
                              </span>
                              <button type="button" className="qty-btn" aria-label={`Mais ${it.name}`} onClick={() => mutate((d) => changeQty(d, it.id, 1))}>
                                <Plus size={16} />
                              </button>
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </Card>
              ))
            )}
            <Cta onClick={() => setEdit("new")} tagline="Casa organizada, mente tranquila.">
              Adicionar item
            </Cta>
          </>
        )}

        {tab === "lista" && (
          <>
            <Card>
              <form onSubmit={addQuick} style={{ display: "flex", gap: 8 }}>
                <input
                  className="input"
                  value={quick}
                  onChange={(e) => setQuick(e.target.value)}
                  placeholder="Adicionar: leite, pão, café…"
                  aria-label="Adicionar à lista"
                  enterKeyHint="done"
                />
                <button type="submit" className="send" aria-label="Adicionar à lista" style={{ flex: "none" }}>
                  <Plus size={22} />
                </button>
              </form>
              {missing.length > 0 && (
                <button
                  type="button"
                  className="btn ghost block"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    mutate((d) => void addMissingToList(d, today));
                    toast("Itens que estão acabando foram adicionados.");
                  }}
                >
                  + {missing.length} que estão acabando em casa
                </button>
              )}
            </Card>
            {shopping.length === 0 ? (
              <p className="empty">Lista vazia. Adicione itens acima, separados por vírgula.</p>
            ) : (
              shopCats.map((c) => (
                <Card key={c}>
                  <h2 className="card-title" style={{ fontSize: 18, marginBottom: 4 }}>
                    {c}
                  </h2>
                  <ul className="list">
                    {shopping
                      .filter((x) => x.category === c)
                      .sort((a, b) => Number(a.checked) - Number(b.checked))
                      .map((x) => {
                        const lp = lastPrice(s, x.name);
                        return (
                          <li key={x.id} className="shop-row">
                            <Check checked={x.checked} label={x.name} onChange={() => mutate((d) => void (d.pantry.shopping.find((y) => y.id === x.id)!.checked = !x.checked))} />
                            <span className={`row-main ${x.checked ? "done-text" : ""}`} style={{ fontSize: 16 }}>
                              {x.name}
                              <small>
                                {fmtQty(x.qty)} {x.unit}
                                {lp ? ` · último: ${money(lp)}/${x.unit}` : ""}
                              </small>
                            </span>
                            <input
                              className="input price-input"
                              inputMode="decimal"
                              placeholder="R$"
                              aria-label={`Preço de ${x.name}`}
                              defaultValue={x.price ? centsToInput(x.price) : ""}
                              onBlur={(e) => {
                                const v = parseMoney(e.target.value);
                                mutate((d) => void (d.pantry.shopping.find((y) => y.id === x.id)!.price = v || null));
                              }}
                            />
                            <button type="button" className="icon-btn" aria-label={`Tirar ${x.name} da lista`} onClick={() => mutate((d) => void (d.pantry.shopping = d.pantry.shopping.filter((y) => y.id !== x.id)))}>
                              <Trash2 size={18} />
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                </Card>
              ))
            )}
            {shopping.length > 0 && (
              <p className="forecast" style={{ marginBottom: 10 }}>
                No carrinho: <b>{checkedCount}</b> de {shopping.length} · Total informado: <b>{money(shoppingTotal(shopping))}</b>
              </p>
            )}
            <Cta onClick={() => setFinish(true)} disabled={!checkedCount} tagline="Marque o que pegou. No fim, a despensa se atualiza sozinha.">
              Concluir compra
            </Cta>
          </>
        )}

        {tab === "validade" && (
          <Card>
            <CardHead title="Validade" sub="Use primeiro o que vence antes." />
            {expiring.length === 0 ? (
              <p className="empty">Nenhum item com validade cadastrada. Informe a validade ao adicionar ou editar um item.</p>
            ) : (
              <ul className="list">
                {expiring.map((it) => {
                  const st = itemStatus(it, today);
                  return (
                    <li key={it.id}>
                      <button type="button" className="row" style={{ width: "100%", textAlign: "left" }} onClick={() => setEdit(it)}>
                        <span className={`bill-date ${st.days != null && st.days <= 2 ? "late" : ""}`}>
                          {st.days == null ? "" : st.days < 0 ? "Vencido" : st.days === 0 ? "Hoje" : st.days === 1 ? "Amanhã" : `${st.days} dias`}
                        </span>
                        <span className="row-main" style={{ fontSize: 15.5 }}>
                          {it.name}
                          <small>
                            {dayMonth(it.expiry!)} · {fmtQty(it.qty)} {it.unit}
                          </small>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>

      <Modal open={edit !== null} onClose={() => setEdit(null)} title={edit === "new" ? "Novo item" : "Editar item"}>
        {edit !== null && <ItemForm key={edit === "new" ? "new" : edit.id} item={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
      </Modal>
      <Modal open={finish} onClose={() => setFinish(false)} title="Concluir compra">
        {finish && <FinishForm onClose={() => setFinish(false)} />}
      </Modal>
    </>
  );
}

function ItemForm({ item, onClose }: { item?: PantryItem; onClose: () => void }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [location, setLocation] = useState<PantryLocation | "">(item?.location ?? "");
  const [qty, setQty] = useState(String(item?.qty ?? 1).replace(".", ","));
  const [unit, setUnit] = useState(item?.unit ?? "un");
  const [minQty, setMinQty] = useState(String(item?.minQty ?? 1).replace(".", ","));
  const [expiry, setExpiry] = useState(item?.expiry ?? "");
  const [price, setPrice] = useState(item?.lastPrice ? centsToInput(item.lastPrice) : "");
  const guess = guessCategory(name);
  const hist = item ? priceHistory(s, item.name) : [];
  const num = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        mutate((d) =>
          savePantryItem(d, {
            id: item?.id,
            name: name.trim(),
            category: category || guess.category,
            location: (location || guess.location) as PantryLocation,
            qty: num(qty),
            unit,
            minQty: num(minQty),
            expiry: expiry || null,
            lastPrice: parseMoney(price),
          }),
        );
        toast("Item salvo.");
        onClose();
      }}
    >
      <Field label="Nome">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Arroz 5kg" required />
      </Field>
      <div className="grid-2">
        <Field label="Quantidade">
          <input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="Unidade">
          <select className="select" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Avisar quando tiver até">
          <input className="input" inputMode="decimal" value={minQty} onChange={(e) => setMinQty(e.target.value)} />
        </Field>
        <Field label="Validade (opcional)">
          <input className="input" type="date" value={expiry} min={addDays(toDateKey(), -365)} onChange={(e) => setExpiry(e.target.value)} />
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Categoria">
          <select className="select" value={category || guess.category} onChange={(e) => setCategory(e.target.value)}>
            {PANTRY_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Onde fica">
          <select className="select" value={location || guess.location} onChange={(e) => setLocation(e.target.value as PantryLocation)}>
            {LOCATIONS.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Preço por unidade (opcional)">
        <input className="input" inputMode="decimal" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>
      {hist.length > 1 && (
        <p className="card-sub" style={{ marginTop: -4 }}>
          Preços anteriores: {hist.map((h) => `${money(h.price)} (${dayMonth(h.date)})`).join(" · ")}
        </p>
      )}
      <button type="submit" className="btn primary block">
        Salvar item
      </button>
      {item && (
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              mutate((d) => void addShopItem(d, { name: item.name, unit: item.unit, pantryId: item.id }));
              toast("Adicionado à lista de compras.");
            }}
          >
            <ShoppingCart size={18} /> Pôr na lista
          </button>
          <button
            type="button"
            className="btn ghost"
            style={{ marginLeft: "auto", color: "#a12f2f" }}
            onClick={() => {
              mutate((d) => removePantryItem(d, item.id));
              toast("Item removido.");
              onClose();
            }}
          >
            <Trash2 size={18} /> Remover
          </button>
        </div>
      )}
    </form>
  );
}

function FinishForm({ onClose }: { onClose: () => void }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const checked = s.pantry.shopping.filter((x) => x.checked);
  const total = shoppingTotal(s.pantry.shopping);
  const accounts = s.finance.accounts.filter((a) => !a.archived);
  const cards = s.finance.cards.filter((c) => !c.archived);
  const mercado = s.finance.categories.find((c) => c.kind === "expense" && norm(c.name) === "mercado");
  const [toPantry, setToPantry] = useState(true);
  const [toFinance, setToFinance] = useState(total > 0);
  const [source, setSource] = useState(`acc:${accounts[0]?.id ?? ""}`);

  return (
    <div>
      <p className="card-sub" style={{ marginTop: -6 }}>
        {checked.length} item(ns) no carrinho{total ? ` · ${money(total)}` : ""}.
      </p>
      <label className="row" style={{ borderBottom: 0, cursor: "pointer" }}>
        <span className="row-main" style={{ fontSize: 15.5 }}>
          Guardar na despensa
          <small>Soma as quantidades nos itens de casa.</small>
        </span>
        <Toggle checked={toPantry} onChange={() => setToPantry((v) => !v)} label="Guardar na despensa" />
      </label>
      <label className="row" style={{ borderBottom: 0, cursor: "pointer", opacity: total ? 1 : 0.5 }}>
        <span className="row-main" style={{ fontSize: 15.5 }}>
          Lançar gasto nas Finanças
          <small>{total ? `Despesa de ${money(total)} em Mercado.` : "Informe os preços na lista para lançar."}</small>
        </span>
        <Toggle checked={toFinance && total > 0} onChange={() => total && setToFinance((v) => !v)} label="Lançar nas Finanças" />
      </label>
      {toFinance && total > 0 && (
        <Field label="Pagar com" group>
          <div className="chips">
            {accounts.map((a) => (
              <button key={a.id} type="button" className="chip" aria-pressed={source === `acc:${a.id}`} onClick={() => setSource(`acc:${a.id}`)}>
                {a.name}
              </button>
            ))}
            {cards.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={source === `card:${c.id}`} onClick={() => setSource(`card:${c.id}`)}>
                {c.name} (cartão)
              </button>
            ))}
          </div>
        </Field>
      )}
      <button
        type="button"
        className="btn primary block"
        style={{ marginTop: 10 }}
        onClick={() => {
          const [kind, id] = source.split(":");
          mutate((d) => {
            finishShopping(d, {
              toPantry,
              expense: toFinance && total > 0 ? { accountId: kind === "acc" ? id : null, cardId: kind === "card" ? id : null, categoryId: mercado?.id ?? null } : null,
            });
          });
          toast(`Compra concluída: ${checked.length} item(ns)${toFinance && total ? `, ${money(total)} lançado` : ""}.`);
          onClose();
        }}
      >
        Concluir
      </button>
    </div>
  );
}
