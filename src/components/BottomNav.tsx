"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, GraduationCap, House, LayoutGrid, Wallet } from "lucide-react";

const TABS = [
  { href: "/hoje", label: "Hoje", Icon: House, match: ["/hoje"] },
  { href: "/agenda", label: "Agenda", Icon: CalendarDays, match: ["/agenda"] },
  { href: "/financas", label: "Finanças", Icon: Wallet, match: ["/financas"] },
  { href: "/aprender", label: "Aprender", Icon: GraduationCap, match: ["/aprender"] },
  {
    href: "/mais",
    label: "Mais",
    Icon: LayoutGrid,
    match: ["/mais", "/avisos", "/assistente", "/conta", "/fe", "/perfil", "/rotina", "/casa", "/leitura", "/familia", "/metas", "/meu-dia"],
  },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Navegação principal">
      {TABS.map(({ href, label, Icon, match }) => {
        const active = match.some((m) => path.startsWith(m));
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}>
            <Icon size={26} strokeWidth={active ? 2.2 : 1.7} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.14 : 0} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
