import {
  AlarmClock,
  Book,
  BookOpen,
  Briefcase,
  Check,
  Church,
  Coffee,
  Droplet,
  Dumbbell,
  Footprints,
  Heart,
  List,
  type LucideProps,
  Moon,
  Shirt,
  ShowerHead,
  Smartphone,
  Sun,
  Target,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import type { IconKey } from "@/lib/types";

/** Mãos em oração (não existe no lucide). Mesmo estilo de traço. */
export function PrayIcon({ size = 24, strokeWidth = 1.7, className }: LucideProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 13.5V5.2c0-1-.7-1.6-1.4-1.3-.5.2-.9.6-1.1 1.2L7.6 12 5 15.3c-.4.5-.5 1.2-.3 1.8L6 20.5h3.4l2-2.5c.4-.5.6-1.2.6-1.9z" />
      <path d="M12 13.5V5.2c0-1 .7-1.6 1.4-1.3.5.2.9.6 1.1 1.2l1.9 6.9 2.6 3.3c.4.5.5 1.2.3 1.8L18 20.5h-3.4l-2-2.5c-.4-.5-.6-1.2-.6-1.9z" />
    </svg>
  );
}

const MAP: Record<Exclude<IconKey, "pray">, React.ComponentType<LucideProps>> = {
  dumbbell: Dumbbell,
  shower: ShowerHead,
  coffee: Coffee,
  bible: BookOpen,
  book: Book,
  list: List,
  alarm: AlarmClock,
  phone: Smartphone,
  shirt: Shirt,
  droplet: Droplet,
  moon: Moon,
  sun: Sun,
  church: Church,
  target: Target,
  heart: Heart,
  users: Users,
  check: Check,
  briefcase: Briefcase,
  walk: Footprints,
};

export const ICON_CHOICES: { key: IconKey; label: string }[] = [
  { key: "alarm", label: "Despertar" },
  { key: "pray", label: "Oração" },
  { key: "dumbbell", label: "Academia" },
  { key: "shower", label: "Banho" },
  { key: "coffee", label: "Café" },
  { key: "bible", label: "Bíblia" },
  { key: "book", label: "Livro" },
  { key: "list", label: "Lista" },
  { key: "phone", label: "Celular" },
  { key: "shirt", label: "Roupa" },
  { key: "droplet", label: "Água" },
  { key: "moon", label: "Dormir" },
  { key: "church", label: "Igreja" },
  { key: "users", label: "Família" },
  { key: "walk", label: "Caminhada" },
  { key: "briefcase", label: "Trabalho" },
  { key: "target", label: "Meta" },
  { key: "check", label: "Geral" },
];

export function Icon({ name, size = 24, strokeWidth = 1.7, className }: { name: IconKey | "food"; size?: number; strokeWidth?: number; className?: string }) {
  if (name === "pray") return <PrayIcon size={size} strokeWidth={strokeWidth} className={className} />;
  const C = name === "food" ? UtensilsCrossed : (MAP[name] ?? Check);
  return <C size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}
