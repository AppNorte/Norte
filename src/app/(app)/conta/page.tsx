"use client";

import { AuthPanel } from "@/components/AuthPanel";
import { Hero } from "@/components/Hero";
import { Card, CardHead } from "@/components/ui";

export default function Conta() {
  return (
    <>
      <Hero title="Conta e nuvem" sub="Seus dados seguros e com você." quote="Guarde o que importa." />
      <div className="sheet">
        <AuthPanel />
        <Card>
          <CardHead title="Como funciona" />
          <ul className="list">
            <li className="row">
              <span className="row-main" style={{ fontSize: 15 }}>
                Sem login, tudo fica salvo só neste aparelho.
              </span>
            </li>
            <li className="row">
              <span className="row-main" style={{ fontSize: 15 }}>
                Com login, cada alteração vai para a nuvem em segundos e funciona offline também.
              </span>
            </li>
            <li className="row">
              <span className="row-main" style={{ fontSize: 15 }}>
                Seus dados são só seus: ninguém mais tem acesso à sua conta.
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
