// Testes de aceitação ponta a ponta (docs/ACCEPTANCE_TESTS.md) + capturas de tela.
// Uso: rode o app (npm run build && npm start) e depois `npm run test:e2e`.
// Variáveis: BASE_URL (padrão http://localhost:3000), SHOTS=0 para não salvar capturas.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

// Playwright vem pré-instalado no ambiente (resolução CommonJS); se preferir, `npm i -D playwright`.
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOTS = process.env.SHOTS !== "0";
const OUT = path.resolve("screenshots");
if (SHOTS) fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
};

async function shot(page, name) {
  if (!SHOTS) return;
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
// Manhã fixa para resultados previsíveis (o app muda de "manhã" para "noite" sozinho).
await page.clock.setFixedTime(new Date("2026-09-11T09:41:00-03:00"));
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

try {
  // ---------- Splash + Onboarding ----------
  await page.goto(`${BASE}/`);
  await page.getByRole("link", { name: /Começar/ }).waitFor();
  await shot(page, "01-splash");
  await page.getByRole("link", { name: /Começar/ }).click();
  await page.getByRole("heading", { name: "Monte seu NORTE" }).waitFor();
  check("Onboarding abre a partir do Splash", true);
  await shot(page, "02-onboarding");
  await page.getByRole("button", { name: /Finalizar configuração/ }).click();
  await page.waitForURL(/\/hoje\/?(\?.*)?$/);
  check("Onboarding leva para Hoje", true);

  // ---------- Hoje ----------
  await page.getByRole("heading", { name: /Bom dia, Daylerson/ }).waitFor();
  await shot(page, "03-hoje");
  const oracao = page.getByRole("checkbox", { name: "Oração" });
  await oracao.click();
  check("Hoje: marcar item da rotina", (await oracao.getAttribute("aria-checked")) === "true");
  await page.reload();
  await page.getByRole("heading", { name: /Bom dia/ }).waitFor();
  check("Estado persiste após recarregar", (await page.getByRole("checkbox", { name: "Oração" }).getAttribute("aria-checked")) === "true");

  await page.getByRole("button", { name: "Editar" }).first().click();
  await page.getByLabel("Prioridade 1").fill("Finalizar o planejamento da semana");
  await page.getByRole("button", { name: "Salvar prioridades" }).click();
  check("Hoje: editar 3 prioridades", await page.getByText("Finalizar o planejamento da semana").isVisible());
  check("Hoje: ver leitura", await page.getByText(/Hoje: João 1/).isVisible());
  check("Sem rolagem horizontal (390px) em Hoje", await noHorizontalScroll(page));

  // ---------- Navegação 5 abas ----------
  const tabs = [
    ["Finanças", "/financas"],
    ["Casa", "/casa"],
    ["Rotina", "/rotina"],
    ["Mais", "/mais"],
    ["Hoje", "/hoje"],
  ];
  let navOk = true;
  for (const [label, url] of tabs) {
    await page.getByRole("navigation").getByRole("link", { name: label }).click();
    await page.waitForURL(new RegExp(url + "/?(\\?.*)?$"));
    navOk &&= (await page.getByRole("navigation").getByRole("link", { name: label }).getAttribute("aria-current")) === "page";
  }
  check("Navegação por 5 abas funciona", navOk);

  // ---------- Rotina ----------
  await page.getByRole("navigation").getByRole("link", { name: "Rotina" }).click();
  await page.getByRole("heading", { name: "Seu progresso" }).waitFor();
  await shot(page, "04-rotina");
  check("Rotina: plano progressivo (6h30 → 5h00)", (await page.getByText("6h30").first().isVisible()) && (await page.getByText("5h00").first().isVisible()));
  await page.getByRole("checkbox", { name: /Preparar roupa/ }).click();
  check("Rotina: registrar conclusão por data", (await page.getByRole("checkbox", { name: /Preparar roupa/ }).getAttribute("aria-checked")) === "true");
  await page.getByRole("button", { name: "Editar" }).first().click();
  const firstTime = page.getByRole("dialog").getByLabel("Horário").first();
  await firstTime.fill("21:30");
  await page.getByRole("dialog").getByRole("button", { name: "Descer" }).first().click();
  await page.getByRole("button", { name: "Pronto" }).click();
  check("Rotina: editar horário/ordem", await page.getByText("21h30").isVisible());
  // Trocar manhã ↔ noite, desfazer, e mover um item escolhido
  const periodOf = (title) => page.evaluate((t) => JSON.parse(localStorage.getItem("norte:v1")).routine.find((r) => r.title === t)?.period, title);
  await page.getByRole("button", { name: "Editar" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Trocar manhã ↔ noite" }).click();
  await page.waitForTimeout(300);
  const swapped = (await periodOf("Dormir")) === "morning" && (await periodOf("Café")) === "evening" && (await periodOf("Acordar")) === "morning";
  check("Rotina: trocar manhã ↔ noite (Acordar fica na manhã)", swapped);
  await page.locator(".toast").getByRole("button", { name: "Desfazer" }).click();
  await page.waitForTimeout(300);
  check("Rotina: desfazer a troca", (await periodOf("Dormir")) === "evening");
  await page.getByRole("dialog").getByRole("button", { name: "Escolher itens" }).click();
  await page.getByRole("dialog").getByRole("checkbox", { name: "Escolher Deixar água pronta" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^Mover 1 para a/ }).click();
  await page.waitForTimeout(300);
  check("Rotina: mover item escolhido para o outro período", (await periodOf("Deixar água pronta")) === "morning");
  await page.locator(".toast").getByRole("button", { name: "Desfazer" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Pronto" }).click();

  // Pular um dia não quebra: avança o relógio 2 dias
  await page.clock.setFixedTime(new Date("2026-09-13T09:41:00-03:00"));
  await page.reload();
  await page.getByRole("heading", { name: "Seu progresso" }).waitFor();
  check("Rotina: não quebra se pular dia", (await page.getByRole("checkbox", { name: /Preparar roupa/ }).getAttribute("aria-checked")) === "false");
  await page.clock.setFixedTime(new Date("2026-09-11T09:41:00-03:00"));
  await page.reload();

  // ---------- Leitura ----------
  await page.goto(`${BASE}/mais`);
  await page.getByRole("link", { name: /Leitura/ }).click();
  await page.getByRole("heading", { name: "Bíblia" }).waitFor();
  check("Leitura: plano bíblico mostra progresso", await page.getByText("0 de 21 capítulos").isVisible());
  await page.getByRole("button", { name: "Ver detalhes" }).click();
  await page.getByRole("dialog").getByLabel("Título").fill("Hábitos e Disciplina");
  await page.getByRole("dialog").getByLabel("Total de páginas").fill("100");
  await page.getByRole("dialog").getByLabel("Páginas lidas").fill("30");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true }).click();
  check("Leitura: livro atual tem página/meta", await page.getByText("Páginas 31 – 40").isVisible());
  await page.getByRole("button", { name: "Ver todos" }).click();
  await page.getByRole("dialog").getByLabel("Título").fill("A coragem de ser imperfeito");
  await page.getByRole("dialog").getByLabel("Autor (opcional)").fill("Brené Brown");
  await page.getByRole("dialog").getByRole("button", { name: /Adicionar à fila/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ler agora" }).click();
  const currentCount = await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).books.filter((b) => b.status === "current").length);
  check("Leitura: um livro current por usuário", currentCount === 1);
  // volta o livro anterior para atual
  await page.getByRole("dialog").getByRole("button", { name: "Ler agora" }).click();
  await page.getByRole("button", { name: "Fechar" }).click();
  await shot(page, "05-leitura");
  await page.getByLabel("Sua reflexão").fill("Deus me lembrou de ser constante.");
  await page.getByRole("button", { name: "Salvar reflexão" }).click();
  const refl = await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).reflections.length);
  check("Leitura: registrar reflexão", refl === 1);
  await page.getByRole("button", { name: /Marcar leitura como concluída/ }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  check("Leitura: concluir capítulo atual", await page.getByText("1 de 21 capítulos").isVisible());
  const bibleHref = await page.getByRole("link", { name: /no app da Bíblia/ }).getAttribute("href");
  check("Leitura: abrir capítulo do dia no app da Bíblia", /bible\.com\/pt\/bible\/129\/JHN\.1\.NVI$/.test(bibleHref ?? ""), bibleHref ?? "");
  await page.getByRole("button", { name: "Ver detalhes" }).click();
  await page.getByRole("dialog").getByPlaceholder("Cole aqui o link do livro").fill("skeelo.com/livro/exemplo");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
  const skeelo = page.getByRole("link", { name: "Continuar no Skeelo" });
  check("Leitura: link do livro (Skeelo) com botão Continuar", (await skeelo.getAttribute("href")) === "https://skeelo.com/livro/exemplo");
  check("Sem rolagem horizontal (390px) em Leitura", await noHorizontalScroll(page));

  // ---------- Família ----------
  await page.goto(`${BASE}/mais`);
  await page.getByRole("link", { name: /Família/ }).click();
  await page.getByRole("heading", { name: "Esta semana" }).waitFor();
  const names = await Promise.all(["Tempo com Bia", "Tempo com Isabella", "Tempo com Davi"].map((n) => page.getByText(n).isVisible()));
  check("Família: mostra Bia, Isabella e Davi", names.every(Boolean));
  await page.getByRole("button", { name: /Hoje joguei bola com Davi/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Davi", exact: true }).click();
  await page.getByRole("dialog").getByPlaceholder(/Jogamos bola/).fill("Jogamos bola no fim da tarde");
  await page.getByRole("dialog").getByRole("button", { name: "Registrar" }).click();
  check("Família: registrar momento", await page.getByText("1/3").first().isVisible());
  await page.getByRole("button", { name: /Planejar tempo em família/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Isabella", exact: true }).click();
  await page.getByRole("dialog").getByPlaceholder(/Noite de jogos/).fill("Conversar sobre a escola");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar plano" }).click();
  check("Família: planejar momento futuro", await page.getByText("Conversar sobre a escola").first().isVisible());
  check("Família: progresso semanal leve", await page.getByRole("progressbar", { name: /Tempo com Davi: 1 de 3/ }).isVisible());
  await shot(page, "06-familia");


  // ---------- Finanças ----------
  const finTab = (name) => page.getByRole("navigation", { name: "Seções de Finanças" }).getByRole("link", { name, exact: true }).click();
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Finanças" }).click();
  await page.locator(".trio").waitFor();
  // Contas: saldo inicial da conta principal
  await finTab("Contas");
  await page.locator(".acc-main", { hasText: "Conta principal" }).click();
  await page.getByRole("dialog").getByLabel(/Saldo inicial/).fill("1.000,00");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar conta" }).click();
  check("Finanças: saldo da conta", await page.locator(".acc-vals").getByText("R$ 1.000,00").isVisible());
  await finTab("Resumo");
  // Despesa à vista
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByRole("dialog").getByLabel("Valor", { exact: true }).fill("150,50");
  await page.getByRole("dialog").getByRole("button", { name: /Mercado/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Salvar lançamento" }).click();
  check("Finanças: despesa reduz o saldo", await page.locator(".trio-main").getByText("R$ 849,50").isVisible());
  // Receita a receber
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByRole("tab", { name: "Receita" }).click();
  await page.getByRole("dialog").getByLabel("Valor", { exact: true }).fill("3000");
  await page.getByRole("dialog").getByRole("switch", { name: "Pago" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Salvar lançamento" }).click();
  check("Finanças: receita pendente entra no previsto", await page.locator(".trio").getByText("R$ 3.849,50").isVisible());
  check("Finanças: gráfico do saldo dia a dia", await page.getByRole("img", { name: "Saldo dia a dia do mês" }).isVisible());
  // Cartão + compra parcelada
  await finTab("Cartões");
  await page.getByRole("button", { name: /Adicionar cartão/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Nubank" }).click();
  await page.getByRole("dialog").getByLabel("Limite").fill("2000");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar cartão" }).click();
  await page.getByRole("button", { name: "Nova compra no Nubank" }).click();
  await page.getByRole("dialog").getByLabel("Valor", { exact: true }).fill("600");
  await page.getByRole("dialog").getByPlaceholder(/Mercado do mês/).fill("Tênis");
  await page.getByRole("dialog").getByRole("radio", { name: "Parcelar ou repetir" }).click();
  await page.getByRole("dialog").getByLabel("Total de parcelas").fill("3");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar lançamento" }).click();
  const parcels = await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).finance.transactions.filter((t) => t.installment).map((t) => [t.amount, t.invoiceMonth]));
  check("Finanças: compra em 3x no cartão", parcels.length === 3 && parcels.every((p) => p[0] === 20000) && new Set(parcels.map((p) => p[1])).size === 3);
  check("Finanças: limite disponível", await page.locator(".cc").getByText("R$ 1.400,00").isVisible());
  check("Finanças: selo do banco e bandeira", (await page.locator(".cc .bank-badge").first().textContent()) === "nu");
  await page.getByRole("button", { name: "Ver fatura do Nubank" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Próxima fatura" }).click();
  check("Finanças: fatura mostra a parcela", await page.getByRole("dialog").getByText(/Tênis/).first().isVisible());
  await page.getByRole("button", { name: "Fechar" }).click();
  await page.getByRole("button", { name: "Mês anterior" }).click(); // a fatura levou o mês para outubro
  await finTab("Resumo");
  check("Finanças: parcela conta no mês certo", (await page.locator(".ov", { hasText: "Despesas" }).locator("b").textContent())?.includes("350,50"));
  check("Finanças: compra no cartão não mexe no saldo", (await page.locator(".trio-main b").textContent())?.includes("849,50"));
  check("Finanças: economia mensal", (await page.getByText("de economia").count()) === 1);

  // Importar extrato OFX
  await page.getByRole("button", { name: "Extrato", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Arquivo do extrato").setInputFiles(path.resolve("scripts/fixtures/extrato-exemplo.ofx"));
  await page.getByRole("dialog").getByText("SUPERMERCADO BOM PRECO").waitFor();
  check("Finanças: extrato OFX lido com categoria automática", await page.getByRole("dialog").getByText(/Mercado/).first().isVisible());
  await page.getByRole("dialog").getByRole("button", { name: /^Importar 3/ }).click();
  const imp = await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).finance.transactions.filter((t) => t.notes.startsWith("[import:")).length);
  check("Finanças: importa 3 lançamentos", imp === 3);
  await page.getByRole("button", { name: "Extrato", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Arquivo do extrato").setInputFiles(path.resolve("scripts/fixtures/extrato-exemplo.ofx"));
  await page.getByRole("dialog").getByText(/3 já existem/).waitFor();
  check("Finanças: não duplica ao importar de novo", true);
  await page.getByRole("button", { name: "Fechar" }).click();

  // Abas novas
  await finTab("Transações");
  await page.getByRole("button", { name: "Despesas", exact: true }).click();
  check("Transações: filtro de despesas", (await page.getByText("Tênis").count()) > 0 && (await page.getByText("PAGAMENTO DE SALARIO").count()) === 0);
  await finTab("Orçamentos");
  await page.getByRole("heading", { name: "Orçamento do mês" }).waitFor();
  check("Orçamentos: tela abre", true);
  await finTab("Objetivos");
  await page.getByRole("button", { name: /Criar o primeiro objetivo/ }).click();
  await page.getByRole("dialog").getByLabel("Nome").fill("Reserva de emergência");
  await page.getByRole("dialog").getByLabel("Valor do objetivo").fill("1000");
  await page.getByRole("dialog").getByLabel(/Já tenho guardado/).fill("100");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar objetivo" }).click();
  await page.getByRole("button", { name: /Guardar/ }).first().click();
  await page.getByRole("dialog").getByLabel("Valor", { exact: true }).fill("150");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar", exact: true }).click();
  check("Objetivos: guardar dinheiro", await page.getByText("25%").isVisible());
  await finTab("Calendário");
  await page.locator(".cal-d").first().waitFor();
  check("Calendário: dias do mês", (await page.locator(".cal-d").count()) === 30, String(await page.locator(".cal-d").count()));
  await finTab("Relatórios");
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Exportar todos os lançamentos/ }).click()]);
  const csvText = fs.readFileSync(await csv.path(), "utf8");
  check("Relatórios: exporta planilha", csvText.includes("Data;Tipo;Descrição") && csvText.includes("Tênis"));
  // Ajuste de saldo não vira receita
  await finTab("Contas");
  await page.getByRole("button", { name: "Ajustar saldo de Conta principal" }).click();
  await page.getByRole("dialog").getByLabel("Saldo real no banco").fill("5.000,00");
  await page.getByRole("dialog").getByRole("button", { name: "Ajustar" }).click();
  check("Contas: ajuste de saldo", await page.locator(".acc-vals").getByText("R$ 5.000,00").first().isVisible());
  await finTab("Resumo");
  check("Contas: ajuste não conta como receita", (await page.locator(".ov", { hasText: "Receitas" }).locator("b").textContent())?.includes("3.500,00"), await page.locator(".ov", { hasText: "Receitas" }).locator("b").textContent());

  // Atalho "Escanear nota" abre a câmera direto
  await page.getByRole("button", { name: "Escanear nota" }).click();
  check("Nota fiscal: atalho abre a leitura do QR", await page.getByRole("dialog", { name: "Ler QR Code da nota" }).isVisible());
  await page.getByRole("dialog", { name: "Ler QR Code da nota" }).getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Fechar" }).click();
  // Nota fiscal: foto com QR Code da NFC-e
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByRole("dialog").getByLabel("Escolher foto da nota").setInputFiles(path.resolve("scripts/fixtures/nfce-qr.png"));
  await page.getByRole("dialog").getByText(/nota ficou guardada|Nota encontrada/).waitFor({ timeout: 30000 });
  check("Nota fiscal: QR lido da foto preenche o valor", (await page.getByRole("dialog").getByLabel("Valor", { exact: true }).inputValue()) === "89,90");
  check("Nota fiscal: link da Sefaz disponível", await page.getByRole("dialog").getByRole("link", { name: /Ver nota na Sefaz/ }).isVisible());
  await page.getByRole("dialog").getByRole("button", { name: "Salvar lançamento" }).click();
  const nf = await page.evaluate(async () => {
    const t = JSON.parse(localStorage.getItem("norte:v1")).finance.transactions.find((x) => x.nfce);
    if (!t) return null;
    const blob = await new Promise((res) => {
      const r = indexedDB.open("norte-files", 1);
      r.onsuccess = () => {
        const g = r.result.transaction("files").objectStore("files").get(t.attachmentId);
        g.onsuccess = () => res(g.result);
        g.onerror = () => res(null);
      };
      r.onerror = () => res(null);
    });
    return { amount: t.amount, date: t.date, chave: t.nfce.chave.length, photo: blob ? blob.size : 0 };
  });
  check("Nota fiscal: lançamento com chave, data e foto guardada", !!nf && nf.amount === 8990 && nf.date === "2026-09-05" && nf.chave === 44 && nf.photo > 0, JSON.stringify(nf));
  // Esconder valores
  await page.getByRole("button", { name: "Esconder valores" }).click();
  check("Finanças: esconder valores", await page.locator(".trio-main").getByText("R$ •••••").isVisible());
  await page.getByRole("button", { name: "Mostrar valores" }).click();
  check("Sem rolagem horizontal (390px) em Finanças", await noHorizontalScroll(page));
  await shot(page, "09-financas");


  // ---------- Casa ----------
  await page.getByRole("navigation").getByRole("link", { name: "Casa" }).click();
  await page.getByRole("button", { name: "Adicionar item" }).first().click();
  await page.getByRole("dialog").getByLabel("Nome").fill("Arroz");
  await page.getByRole("dialog").getByLabel("Quantidade").fill("1");
  await page.getByRole("dialog").getByLabel("Avisar quando tiver até").fill("1");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar item" }).click();
  check("Casa: item na despensa com categoria automática", await page.getByText("Mercearia").isVisible());
  await page.getByRole("button", { name: /acabando\. Adicionar à lista/ }).click();
  check("Casa: item acabando vai para a lista", await page.getByRole("checkbox", { name: "Arroz" }).isVisible());
  await page.getByLabel("Adicionar à lista", { exact: true }).first().fill("leite, café");
  await page.getByRole("button", { name: "Adicionar à lista" }).last().click();
  await page.getByRole("checkbox", { name: "Arroz" }).click();
  await page.getByLabel("Preço de Arroz").fill("25,90");
  await page.getByLabel("Preço de Arroz").blur();
  await page.getByRole("button", { name: /Concluir compra/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Concluir" }).click();
  const casa = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("norte:v1"));
    return { qty: st.pantry.items.find((i) => i.name === "Arroz").qty, left: st.pantry.shopping.length, tx: st.finance.transactions.some((t) => t.amount === 2590 && t.description.startsWith("Compras")) };
  });
  check("Casa: concluir compra soma na despensa", casa.qty === 2);
  check("Casa: itens não comprados ficam na lista", casa.left === 2);
  check("Casa: compra lançada nas Finanças", casa.tx);
  check("Sem rolagem horizontal (390px) em Casa", await noHorizontalScroll(page));
  await shot(page, "11-casa");

  // ---------- Metas, Fé e Perfil ----------
  await page.goto(`${BASE}/metas`);
  await page.getByRole("radio", { name: "Bem", exact: true }).click();
  await page.getByRole("button", { name: "Novo" }).click();
  await page.getByRole("dialog").getByLabel("Hábito").fill("Beber 2L de água");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar hábito" }).click();
  await page.getByRole("checkbox", { name: "Beber 2L de água" }).click();
  check("Metas: hábito marcado hoje", (await page.getByRole("checkbox", { name: "Beber 2L de água" }).getAttribute("aria-checked")) === "true");
  await page.getByRole("button", { name: "Nova", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Meta").fill("Quitar o cartão");
  await page.getByRole("dialog").getByLabel(/Passos/).fill("Listar dívidas\nNegociar juros");
  await page.getByRole("dialog").getByRole("button", { name: "Criar meta" }).click();
  check("Metas: meta com passos", await page.getByText("0 de 2 passos").isVisible());
  await shot(page, "12-metas");
  await page.goto(`${BASE}/fe`);
  check("Fé: mensagem do dia aparece", await page.locator(".daily-text").isVisible());
  await page.getByLabel("Gratidão 1").fill("Minha família");
  await page.getByRole("button", { name: "Salvar gratidão" }).click();
  check("Fé: gratidão registrada", await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).faith.gratitude.length === 1));
  await shot(page, "13-fe");
  await page.goto(`${BASE}/perfil`);
  await page.getByRole("button", { name: "Dinheiro" }).click();
  await page.getByRole("switch", { name: /Permitir que a IA/ }).click();
  await page.getByRole("button", { name: /Salvar perfil/ }).click();
  check("Perfil: salvo com consentimento", await page.evaluate(() => { const m = JSON.parse(localStorage.getItem("norte:v1")).me; return m.aiConsent && m.challenges.includes("Dinheiro"); }));


  // Backup
  await page.goto(`${BASE}/conta`);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Baixar backup" }).click()]);
  const backup = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  const backupFile = await dl.path();
  {
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
    const p2 = await ctx2.newPage();
    await p2.goto(`${BASE}/`);
    await p2.getByRole("link", { name: /Tenho um backup/ }).click();
    await p2.getByLabel("Arquivo de backup").setInputFiles(backupFile);
    await p2.getByRole("button", { name: "Restaurar agora" }).click();
    await p2.waitForURL(/\/hoje\/?(\?.*)?$/);
    check("Backup: restaurar num link/aparelho novo", await p2.getByRole("heading", { name: /Daylerson/ }).isVisible());
    await ctx2.close();
  }
  check("Backup: arquivo com todos os dados", backup.app === "NORTE" && Array.isArray(backup.state.finance.transactions) && backup.state.pantry.items.length > 0);

  // ---------- Meu dia ----------
  await page.getByRole("navigation").getByRole("link", { name: "Hoje" }).click();
  await page.getByRole("link", { name: /ver meu dia/ }).click();
  await page.waitForURL(/\/meu-dia\/?(\?.*)?$/);
  await page.getByRole("button", { name: "Adicionar" }).first().click();
  await page.getByRole("dialog").getByLabel("O quê?").fill("Resolver pendência");
  await page.getByRole("dialog").getByLabel("Horário").fill("16:30");
  await page.getByRole("dialog").getByRole("button", { name: /Adicionar ao meu dia/ }).click();
  check("Meu dia: adicionar compromisso", await page.getByText("Resolver pendência").isVisible());
  await shot(page, "07-meu-dia");

  // ---------- Assistente ----------
  await page.getByRole("link", { name: "Falar com o Assistente NORTE" }).click();
  await page.getByRole("button", { name: "Estou no celular. O que posso fazer agora?" }).click();
  await page.getByText(/sugestões para aproveitar/).waitFor({ timeout: 10000 });
  check("Assistente: responde em modo mock", true);
  await page.getByLabel("Mensagem para o NORTE").fill("Tenho ovos, pão, queijo, banana e café.");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.getByText(/ideias de café da manhã/).waitFor({ timeout: 10000 });
  check("Assistente: ideias de refeição", await page.getByText(/Ovos mexidos com queijo/).isVisible());
  await shot(page, "08-assistente");
  await page.getByLabel("Mensagem para o NORTE").fill("Amanhã quero acordar 5h e ir para academia.");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.getByRole("button", { name: "Confirmar" }).waitFor({ timeout: 10000 });
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).routine.find((r) => r.title === "Academia").time);
  check("Assistente: ação mutável pede confirmação (nada muda antes)", before === "05:30");
  await page.getByLabel("Mensagem para o NORTE").fill("Não consegui finalizar o planejamento da semana");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.getByText(/Remarcar/).waitFor({ timeout: 10000 });
  await page.locator(".proposal", { hasText: "Remarcar" }).getByRole("button", { name: "Confirmar" }).click();
  const moved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("norte:v1")).priorities.find((p) => p.title.startsWith("Finalizar")).date,
  );
  check("Assistente: reorganização após confirmação", moved === "2026-09-12");

  // Assistente: finanças, lista e perfil
  await page.getByLabel("Mensagem para o NORTE").fill("gastei 50 no mercado");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.locator(".proposal", { hasText: "Despesa" }).getByRole("button", { name: "Confirmar" }).click();
  check("Assistente: lança despesa após confirmar", await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).finance.transactions.some((t) => t.amount === 5000)));
  await page.getByLabel("Mensagem para o NORTE").fill("coloca ovos e banana na lista");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.locator(".proposal", { hasText: "lista" }).getByRole("button", { name: "Confirmar" }).click();
  check("Assistente: adiciona à lista de compras", await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).pantry.shopping.some((x) => x.name === "Banana")));
  await page.getByLabel("Mensagem para o NORTE").fill("lembre que eu trabalho até as 18h");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.locator(".proposal", { hasText: "Guardar" }).getByRole("button", { name: "Confirmar" }).click();
  check("Assistente: guarda fato no perfil", await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).me.notes.length === 1));
  check("Sem rolagem horizontal (390px) no Assistente", await noHorizontalScroll(page));

  // Falha da IA não impede o uso: derruba a rota e confere o modo local
  await page.route("**/api/assistant", (r) => r.abort());
  await page.getByLabel("Mensagem para o NORTE").fill("o que falta na minha rotina?");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.getByText(/modo offline/).first().waitFor({ timeout: 10000 });
  check("Falha da IA: responde em modo local", true);
  await page.unroute("**/api/assistant");

  // ---------- Lançamento: opções avançadas ----------
  const txs = () => page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).finance.transactions);
  await page.goto(`${BASE}/financas`);
  // Compra já em andamento: parcela 3 de 5, valor da parcela, fatura seguinte
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  let dlg = page.getByRole("dialog");
  await dlg.getByLabel("Valor", { exact: true }).fill("50");
  await dlg.getByPlaceholder(/Mercado do mês/).fill("Curso online");
  await dlg.getByRole("button", { name: /\(cartão\)/ }).first().click();
  const invBefore = await dlg.locator(".invoice-pick b").textContent();
  await dlg.getByRole("button", { name: "Próxima fatura" }).click();
  await dlg.getByRole("radio", { name: "Parcelar ou repetir" }).click();
  await dlg.getByLabel("Total de parcelas").fill("5");
  await dlg.getByLabel("Começar na parcela").fill("3");
  await dlg.getByRole("radio", { name: "Valor da parcela" }).click();
  await dlg.getByRole("button", { name: "Salvar lançamento" }).click();
  const curso = (await txs()).filter((t) => t.description === "Curso online");
  check(
    "Lançamento: começar na parcela 3 de 5 com valor da parcela",
    curso.length === 3 && curso.every((t) => t.amount === 5000) && curso.map((t) => t.installment.n).join() === "3,4,5",
    JSON.stringify(curso.map((t) => [t.amount, t.installment?.n])),
  );
  check("Lançamento: fatura escolhida manualmente", Boolean(invBefore) && curso[0].invoiceMonth > (await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).finance.transactions.find((t) => t.description === "Tênis").invoiceMonth)));
  // Multicategorias + etiqueta + encargos + ignorar nos totais + salvar e continuar
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  dlg = page.getByRole("dialog");
  await dlg.getByLabel("Valor", { exact: true }).fill("100");
  await dlg.getByPlaceholder(/Mercado do mês/).fill("Compras divididas");
  await dlg.getByRole("switch", { name: "Multicategorias" }).click();
  await dlg.getByLabel("Categoria 1", { exact: true }).selectOption({ index: 1 });
  await dlg.getByLabel("Valor da categoria 1").fill("60");
  await dlg.getByLabel("Categoria 2", { exact: true }).selectOption({ index: 2 });
  await dlg.getByLabel("Valor da categoria 2").fill("50");
  await dlg.getByText("Mais opções").click();
  await dlg.getByLabel("Valor de encargos ou desconto").fill("10");
  await dlg.getByLabel("Nova etiqueta").fill("viagem");
  await dlg.getByLabel("Nova etiqueta").press("Enter");
  await dlg.getByRole("switch", { name: "Ignorar nos totais" }).click();
  await dlg.getByRole("switch", { name: "Salvar e continuar" }).click();
  await dlg.getByRole("button", { name: "Salvar lançamento" }).click();
  const div = (await txs()).find((t) => t.description === "Compras divididas");
  check(
    "Lançamento: multicategorias + encargos + etiqueta + ignorar nos totais",
    div && div.amount === 11000 && div.splits?.length === 2 && div.splits[0].amount + div.splits[1].amount === 11000 && div.extra?.kind === "fee" && div.tags?.includes("viagem") && div.ignore?.totals === true,
    JSON.stringify(div),
  );
  check("Lançamento: salvar e continuar mantém a janela aberta", (await page.getByRole("dialog").isVisible()) && (await page.getByRole("dialog").getByLabel("Valor", { exact: true }).inputValue()) === "");
  await page.keyboard.press("Escape");

  // ---------- Contas do mês abaixo do seletor de mês ----------
  await page.goto(`${BASE}/financas`);
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByRole("dialog").getByLabel("Valor", { exact: true }).fill("95,40");
  await page.getByRole("dialog").getByPlaceholder(/Mercado do mês/).fill("Conta de água");
  await page.getByRole("dialog").getByRole("button", { name: "Conta principal" }).click();
  await page.getByRole("dialog").getByRole("switch", { name: "Pago" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Salvar lançamento" }).click();
  const billsCard = page.locator(".bills-card");
  check("Resumo: contas pendentes logo abaixo do mês", (await billsCard.getByText(/contas? pendentes?/).isVisible()) && (await billsCard.getByText("Conta de água").isVisible()));
  const order = await page.evaluate(() => [...document.querySelector(".sheet").children].map((c) => c.className));
  check("Resumo: aviso de contas vem logo depois do mês", order.indexOf("month-switch fin-month") + 1 === order.findIndex((c) => c.includes("bills-card")), order.join(" | "));
  await billsCard.getByRole("checkbox", { name: /Marcar Conta de água como paga/ }).click();
  const agua = (await txs()).find((t) => t.description === "Conta de água");
  check("Resumo: marcar conta como paga num toque", agua?.paid === true);
  await billsCard.getByRole("button", { name: "Esconder contas pendentes" }).click();
  const hidden = (await billsCard.locator(".bills").count()) === 0;
  await page.reload();
  await page.locator(".bills-card").waitFor();
  const stillHidden = await page.getByRole("button", { name: "Mostrar contas pendentes" }).isVisible();
  await page.getByRole("button", { name: "Mostrar contas pendentes" }).click();
  check("Resumo: esconder contas pendentes (e lembrar a escolha)", hidden && stillHidden);
  await billsCard.getByRole("button", { name: /Pagas no mês|Esconder pagas/ }).first().click().catch(() => {});

  // ---------- Avisos e Google Agenda ----------
  await page.goto(`${BASE}/financas`);
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByRole("dialog").getByLabel("Valor", { exact: true }).fill("180");
  await page.getByRole("dialog").getByPlaceholder(/Mercado do mês/).fill("Conta de luz");
  await page.getByRole("dialog").locator('input[type=date][aria-label="Data"]').fill("2026-09-13");
  await page.getByRole("dialog").getByRole("switch", { name: "Pago" }).click();
  await page.getByRole("dialog").getByRole("radio", { name: "Fixa mensal" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Salvar lançamento" }).click();
  await page.goto(`${BASE}/mais`);
  await page.getByRole("link", { name: /Avisos/ }).click();
  await page.getByText("Avisos no celular").waitFor();
  check("Avisos: próximos 7 dias mostra a conta fixa", await page.locator(".sheet").getByText("Conta de luz").first().isVisible());
  const gcal = await page.getByRole("link", { name: "Adicionar Conta de luz ao Google Agenda" }).getAttribute("href");
  check("Avisos: Google Agenda com lembrete mensal no dia 13", Boolean(gcal?.startsWith("https://calendar.google.com/") && decodeURIComponent(gcal).includes("RRULE:FREQ=MONTHLY;BYMONTHDAY=13")), gcal ?? "");
  await page.goto(`${BASE}/financas/transacoes`);
  await page.getByText("Conta de luz").first().click();
  check("Lançamento: botão Lembrar no Google Agenda", await page.getByRole("dialog").getByRole("link", { name: /Google Agenda/ }).isVisible());
  await page.keyboard.press("Escape");

  // ---------- 360px ----------
  await page.setViewportSize({ width: 360, height: 780 });
  let narrow = true;
  for (const url of ["/hoje", "/financas", "/financas/transacoes", "/financas/contas", "/financas/cartoes", "/financas/orcamentos", "/financas/objetivos", "/financas/calendario", "/financas/relatorios", "/casa", "/mais", "/rotina", "/leitura", "/familia", "/meu-dia", "/assistente", "/conta", "/fe", "/metas", "/perfil", "/avisos"]) {
    await page.goto(`${BASE}${url}`);
    await page.locator(".sheet").waitFor();
    const ok = await noHorizontalScroll(page);
    if (!ok) console.log("   rolagem horizontal em", url);
    narrow &&= ok;
  }
  check("Sem rolagem horizontal em 360px (todas as telas)", narrow);

  // ---------- Computador (1280px): menu lateral, sem menu inferior ----------
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE}/hoje`);
  await page.locator(".side").waitFor();
  check("Computador: menu lateral visível e menu inferior oculto", (await page.locator(".side").isVisible()) && !(await page.locator(".nav").isVisible()));
  await page.locator(".side").getByRole("link", { name: "Finanças" }).click();
  await page.waitForURL(/\/financas\/?$/);
  check("Computador: navegar pelo menu lateral", (await page.locator(".side").getByRole("link", { name: "Finanças" }).getAttribute("aria-current")) === "page");
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.waitForTimeout(500); // fim da animação de entrada
  const box = await page.getByRole("dialog").boundingBox();
  check("Computador: janela centralizada", Boolean(box && box.y >= 20 && box.y + box.height <= 780 && Math.abs(box.x + box.width / 2 - 640) < 4), JSON.stringify(box));
  await page.keyboard.press("Escape");
  let wide = true;
  for (const url of ["/hoje", "/financas", "/financas/transacoes", "/financas/cartoes", "/financas/relatorios", "/casa", "/rotina", "/mais", "/leitura", "/assistente", "/conta", "/avisos", "/metas"]) {
    await page.goto(`${BASE}${url}`);
    await page.locator(".sheet").waitFor();
    const ok = await noHorizontalScroll(page);
    if (!ok) console.log("   rolagem horizontal (1280px) em", url);
    wide &&= ok;
  }
  check("Computador: sem rolagem horizontal", wide);
  check("Nenhum erro de JavaScript na página", errors.length === 0, errors.join(" | "));
} catch (e) {
  check("Execução do roteiro", false, e.message.split("\n")[0]);
  await shot(page, "zz-falha");
} finally {
  await browser.close();
}

// ---------- Nenhuma chave no bundle do navegador ----------
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}
const staticDir = path.resolve(".next/static");
if (fs.existsSync(staticDir)) {
  const leaked = walk(staticDir).filter((f) => /\.(js|css|html)$/.test(f)).filter((f) => /ANTHROPIC_API_KEY|OPENAI_API_KEY|sk-ant-|SUPABASE_SERVICE_ROLE/.test(fs.readFileSync(f, "utf8")));
  check("Sem API key no bundle do navegador", leaked.length === 0, leaked.join(", "));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} verificações passaram.`);
process.exit(failed ? 1 : 0);
