"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, House, Users } from "lucide-react";
import { Compass } from "./Compass";

const TABS = [
  { href: "/hoje", label: "Hoje", Icon: House, match: ["/hoje", "/meu-dia"] },
  { href: "/rotina", label: "Rotina", Icon: CalendarDays, match: ["/rotina"] },
  { href: "/leitura", label: "Leitura", Icon: BookOpen, match: ["/leitura"] },
  { href: "/familia", label: "Família", Icon: Users, match: ["/familia"] },
];

export function BottomNav() {
  const path = usePathname();
  const aiActive = path.startsWith("/assistente");
  return (
    <nav className="nav" aria-label="Navegação principal">
      {TABS.map(({ href, label, Icon, match }) => {
        const active = match.some((m) => path.startsWith(m));
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}>
            <Icon
              size={26}
              strokeWidth={active ? 2.2 : 1.7}
              fill={active ? "currentColor" : "none"}
              fillOpacity={active ? 0.14 : 0}
              aria-hidden="true"
            />
            {label}
          </Link>
        );
      })}
      <Link href="/assistente" className="nav-ai" aria-current={aiActive ? "page" : undefined}>
        <span className="nav-ai-dot">
          <Compass size={22} ring={false} />
        </span>
        Assistente
      </Link>
    </nav>
  );
}
