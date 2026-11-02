"use client";

import { CalendarX, ListChecks, Refrigerator, TrendingDown } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Card, CardHead } from "@/components/ui";
import { SCREEN_VERSES } from "@/lib/content";

export default function Casa() {
  const coming = [
    { icon: <Refrigerator size={24} />, title: "Despensa", sub: "Tudo o que tem em casa, por local (armário, geladeira, freezer)." },
    { icon: <ListChecks size={24} />, title: "Lista de compras", sub: "Gerada pelo que acabou ou está no fim. Marque enquanto compra." },
    { icon: <CalendarX size={24} />, title: "Validade", sub: "Aviso do que vence nos próximos dias para nada estragar." },
    { icon: <TrendingDown size={24} />, title: "Preços", sub: "Histórico de preço por item e gasto do mercado ligado às Finanças." },
  ];
  return (
    <>
      <Hero title="Casa" sub="Despensa e lista de compras." quote={SCREEN_VERSES.casa} />
      <div className="sheet">
        <Card>
          <CardHead title="Em construção" sub="Esta é a próxima etapa do NORTE. Veja o que vem aí:" />
          <ul className="list">
            {coming.map((c) => (
              <li className="row" key={c.title} style={{ alignItems: "flex-start", padding: "10px 0" }}>
                <span className="icon-bubble" style={{ width: 44, height: 44 }}>
                  {c.icon}
                </span>
                <span className="row-main">
                  <b style={{ fontWeight: 600 }}>{c.title}</b>
                  <small style={{ fontSize: 14 }}>{c.sub}</small>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
