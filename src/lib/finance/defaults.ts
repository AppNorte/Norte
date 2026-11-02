import type { FinCategory, FinanceState } from "@/lib/types";
import { uid } from "@/lib/id";

// Categorias iniciais (editáveis). Cores suaves da paleta do NORTE.
const EXPENSE: [string, string, string][] = [
  ["Mercado", "cart", "#2e6b57"],
  ["Alimentação", "food", "#c8901c"],
  ["Moradia", "home", "#173a5b"],
  ["Contas da casa", "bolt", "#1f4f86"],
  ["Transporte", "car", "#4b3d8f"],
  ["Saúde", "health", "#c0334d"],
  ["Educação", "edu", "#24594a"],
  ["Família", "family", "#a84d6b"],
  ["Igreja e doações", "church", "#7a5b2e"],
  ["Lazer", "fun", "#2f7f8f"],
  ["Assinaturas", "repeat", "#5a6b7d"],
  ["Vestuário", "shirt", "#8a5a9e"],
  ["Outros", "other", "#6a7a8c"],
];

const INCOME: [string, string, string][] = [
  ["Salário", "salary", "#2e6b57"],
  ["Renda extra", "extra", "#24594a"],
  ["Rendimentos", "invest", "#1f4f86"],
  ["Outros", "other", "#6a7a8c"],
];

export function defaultCategories(): FinCategory[] {
  return [
    ...EXPENSE.map(([name, icon, color]) => ({ id: uid(), name, kind: "expense" as const, icon, color, budget: null })),
    ...INCOME.map(([name, icon, color]) => ({ id: uid(), name, kind: "income" as const, icon, color, budget: null })),
  ];
}

export function defaultFinance(): FinanceState {
  return {
    accounts: [{ id: uid(), name: "Conta principal", type: "checking", initialBalance: 0, color: "#2e6b57", archived: false }],
    cards: [],
    categories: defaultCategories(),
    transactions: [],
    recurring: [],
    hideValues: false,
  };
}

export const ACCOUNT_COLORS = ["#2e6b57", "#173a5b", "#8a05be", "#ec7000", "#cc092f", "#ffcc00", "#00a868", "#1f4f86", "#6a7a8c"];
