// Regras da Casa / Despensa (puras).
import type { AppState, PantryItem, PantryLocation, ShopItem } from "./types";
import { uid } from "./id";
import { diffDays, toDateKey } from "./dates";
import { addTransaction } from "./finance/logic";

export const PANTRY_CATEGORIES = [
  "Hortifruti",
  "Açougue e peixes",
  "Frios e laticínios",
  "Padaria",
  "Mercearia",
  "Bebidas",
  "Congelados",
  "Limpeza",
  "Higiene",
  "Bebê e pet",
  "Outros",
];

export const LOCATIONS: { key: PantryLocation; label: string }[] = [
  { key: "despensa", label: "Despensa" },
  { key: "geladeira", label: "Geladeira" },
  { key: "freezer", label: "Freezer" },
  { key: "limpeza", label: "Área de serviço" },
  { key: "outro", label: "Outro" },
];

export const UNITS = ["un", "kg", "g", "L", "ml", "pct", "cx", "dz", "lata"];

export function norm(t: string) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

const RULES: [RegExp, string, PantryLocation][] = [
  [/banana|maca|laranja|limao|tomate|alface|cebola|alho|batata|cenoura|fruta|verdura|legume|mamao|abacate|uva|morango|pepino|couve|cheiro verde/, "Hortifruti", "geladeira"],
  [/carne|frango|peixe|linguica|bacon|costela|patinho|alcatra|file|moida|salsicha/, "Açougue e peixes", "freezer"],
  [/leite|queijo|presunto|iogurte|manteiga|requeijao|creme de leite|mussarela|ovo/, "Frios e laticínios", "geladeira"],
  [/pao|bisnaguinha|bolo|torrada/, "Padaria", "despensa"],
  [/refrigerante|suco|agua|cerveja|vinho|cha\b/, "Bebidas", "despensa"],
  [/sorvete|congelad|pizza|lasanha|nuggets|hamburguer|polpa/, "Congelados", "freezer"],
  [/detergente|sabao|amaciante|desinfetante|agua sanitaria|esponja|limpador|alvejante|saco de lixo|papel toalha/, "Limpeza", "limpeza"],
  [/papel higienico|sabonete|shampoo|condicionador|creme dental|pasta de dente|desodorante|absorvente|escova/, "Higiene", "outro"],
  [/fralda|racao|lenco umedecido/, "Bebê e pet", "outro"],
  [/arroz|feijao|macarrao|acucar|sal\b|oleo|azeite|farinha|cafe|biscoito|bolacha|molho|extrato|milho|ervilha|atum|sardinha|aveia|granola|tempero|vinagre|achocolatado|fuba|tapioca|cuscuz/, "Mercearia", "despensa"],
];

export function guessCategory(name: string): { category: string; location: PantryLocation } {
  const n = norm(name);
  for (const [re, category, location] of RULES) if (re.test(n)) return { category, location };
  return { category: "Outros", location: "despensa" };
}

export type ItemStatus = "ok" | "low" | "out" | "expiring" | "expired";

export function itemStatus(it: PantryItem, today = toDateKey()): { status: ItemStatus; days: number | null } {
  const days = it.expiry ? diffDays(it.expiry, today) : null;
  if (it.qty <= 0) return { status: "out", days };
  if (days != null && days < 0) return { status: "expired", days };
  if (days != null && days <= 5) return { status: "expiring", days };
  if (it.qty <= it.minQty) return { status: "low", days };
  return { status: "ok", days };
}

export function pantrySummary(s: AppState, today = toDateKey()) {
  let low = 0;
  let expiring = 0;
  for (const it of s.pantry.items) {
    const st = itemStatus(it, today).status;
    if (st === "low" || st === "out") low++;
    if (st === "expiring" || st === "expired") expiring++;
  }
  return { total: s.pantry.items.length, low, expiring, toBuy: s.pantry.shopping.filter((x) => !x.checked).length };
}

export function fmtQty(q: number) {
  return Number.isInteger(q) ? String(q) : q.toFixed(q < 1 ? 2 : 1).replace(".", ",");
}

// ---------- Mutações ----------

export function savePantryItem(s: AppState, it: Partial<PantryItem> & { name: string }) {
  const now = new Date().toISOString();
  if (it.id) {
    const ex = s.pantry.items.find((x) => x.id === it.id);
    if (ex) Object.assign(ex, it, { updatedAt: now });
    return;
  }
  const g = guessCategory(it.name);
  s.pantry.items.push({
    id: uid(),
    name: it.name.trim(),
    category: it.category ?? g.category,
    location: it.location ?? g.location,
    qty: it.qty ?? 1,
    unit: it.unit ?? "un",
    minQty: it.minQty ?? 1,
    expiry: it.expiry ?? null,
    lastPrice: it.lastPrice ?? null,
    updatedAt: now,
  });
}

export function changeQty(s: AppState, id: string, delta: number) {
  const it = s.pantry.items.find((x) => x.id === id);
  if (!it) return;
  const step = it.unit === "kg" || it.unit === "L" ? 0.5 : 1;
  it.qty = Math.max(0, Math.round((it.qty + delta * step) * 100) / 100);
  it.updatedAt = new Date().toISOString();
}

export function removePantryItem(s: AppState, id: string) {
  s.pantry.items = s.pantry.items.filter((x) => x.id !== id);
}

export function addShopItem(s: AppState, i: { name: string; qty?: number; unit?: string; pantryId?: string | null }) {
  const raw = i.name.trim();
  const name = raw.charAt(0).toUpperCase() + raw.slice(1);
  if (!name) return false;
  const exists = s.pantry.shopping.find((x) => !x.checked && norm(x.name) === norm(name));
  if (exists) {
    exists.qty += i.qty ?? 1;
    return false;
  }
  const pantry = i.pantryId ? s.pantry.items.find((p) => p.id === i.pantryId) : s.pantry.items.find((p) => norm(p.name) === norm(name));
  s.pantry.shopping.push({
    id: uid(),
    name,
    qty: i.qty ?? 1,
    unit: i.unit ?? pantry?.unit ?? "un",
    category: pantry?.category ?? guessCategory(name).category,
    checked: false,
    price: null,
    pantryId: pantry?.id ?? null,
  });
  return true;
}

/** Itens que acabaram/estão acabando e ainda não estão na lista. */
export function missingItems(s: AppState, today = toDateKey()): PantryItem[] {
  return s.pantry.items.filter((it) => {
    const st = itemStatus(it, today).status;
    return (st === "low" || st === "out") && !s.pantry.shopping.some((x) => !x.checked && (x.pantryId === it.id || norm(x.name) === norm(it.name)));
  });
}

export function addMissingToList(s: AppState, today = toDateKey()) {
  const list = missingItems(s, today);
  for (const it of list) addShopItem(s, { name: it.name, qty: Math.max(1, Math.ceil(it.minQty * 2 - it.qty)), unit: it.unit, pantryId: it.id });
  return list.length;
}

export function lastPrice(s: AppState, name: string): number | null {
  const n = norm(name);
  const hits = s.pantry.prices.filter((p) => p.name === n);
  return hits.length ? hits[hits.length - 1].price : null;
}

export function priceHistory(s: AppState, name: string) {
  const n = norm(name);
  return s.pantry.prices.filter((p) => p.name === n).slice(-6);
}

export interface FinishOptions {
  toPantry: boolean;
  expense: { accountId: string | null; cardId: string | null; categoryId: string | null } | null;
  date?: string;
}

/** Fecha a compra: itens marcados vão para a despensa, preços para o histórico e (opcional) gasto nas Finanças. */
export function finishShopping(s: AppState, opts: FinishOptions) {
  const date = opts.date ?? toDateKey();
  const bought = s.pantry.shopping.filter((x) => x.checked);
  let total = 0;
  for (const b of bought) {
    if (b.price) {
      total += b.price;
      s.pantry.prices.push({ name: norm(b.name), date, price: Math.round(b.price / Math.max(1, b.qty)) });
    }
    if (!opts.toPantry) continue;
    const it = (b.pantryId && s.pantry.items.find((p) => p.id === b.pantryId)) || s.pantry.items.find((p) => norm(p.name) === norm(b.name));
    if (it) {
      it.qty = Math.round((it.qty + b.qty) * 100) / 100;
      if (b.price) it.lastPrice = Math.round(b.price / Math.max(1, b.qty));
      it.updatedAt = new Date().toISOString();
    } else {
      savePantryItem(s, { name: b.name, qty: b.qty, unit: b.unit, category: b.category, lastPrice: b.price ? Math.round(b.price / Math.max(1, b.qty)) : null });
    }
  }
  if (s.pantry.prices.length > 600) s.pantry.prices = s.pantry.prices.slice(-600);
  s.pantry.shopping = s.pantry.shopping.filter((x) => !x.checked);
  if (opts.expense && total > 0) {
    addTransaction(s, {
      kind: "expense",
      amount: total,
      date,
      description: `Compras do mercado (${bought.length} itens)`,
      categoryId: opts.expense.categoryId,
      accountId: opts.expense.accountId,
      cardId: opts.expense.cardId,
      paid: true,
    });
  }
  return { count: bought.length, total };
}

export function shoppingTotal(list: ShopItem[]) {
  return list.filter((x) => x.checked && x.price).reduce((a, x) => a + (x.price ?? 0), 0);
}
