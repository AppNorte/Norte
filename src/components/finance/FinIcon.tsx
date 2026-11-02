import {
  Car,
  Church,
  CreditCard,
  Ellipsis,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  type LucideProps,
  PiggyBank,
  Repeat,
  Shirt,
  ShoppingCart,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  Zap,
} from "lucide-react";
import type { AccountType } from "@/lib/types";

const MAP: Record<string, React.ComponentType<LucideProps>> = {
  cart: ShoppingCart,
  food: Utensils,
  home: House,
  bolt: Zap,
  car: Car,
  health: HeartPulse,
  edu: GraduationCap,
  family: Users,
  church: Church,
  fun: Ticket,
  repeat: Repeat,
  shirt: Shirt,
  other: Ellipsis,
  salary: Wallet,
  extra: Sparkles,
  invest: TrendingUp,
  card: CreditCard,
};

export const CATEGORY_ICONS = Object.keys(MAP).filter((k) => k !== "card");

export function FinIcon({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  const C = MAP[name] ?? Ellipsis;
  return <C size={size} strokeWidth={1.8} color={color} aria-hidden="true" />;
}

export function AccountIcon({ type, size = 20 }: { type: AccountType; size?: number }) {
  const C = type === "savings" ? PiggyBank : type === "cash" ? Wallet : type === "investment" ? TrendingUp : Landmark;
  return <C size={size} strokeWidth={1.8} aria-hidden="true" />;
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  cash: "Dinheiro / carteira",
  investment: "Investimento",
};

/** Bolinha de categoria com cor suave. */
export function CatDot({ icon, color, size = 38 }: { icon: string; color: string; size?: number }) {
  return (
    <span
      className="cat-dot"
      style={{ width: size, height: size, background: `${color}1f`, color }}
    >
      <FinIcon name={icon} size={Math.round(size * 0.5)} />
    </span>
  );
}
